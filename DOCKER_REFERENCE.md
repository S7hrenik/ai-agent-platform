# Docker Reference — AI Agent Platform

## Files Created

| File | Purpose |
|---|---|
| `backend/Dockerfile` | Containerizes the FastAPI backend |
| `frontend/Dockerfile` | Multi-stage build: React → nginx |
| `frontend/nginx.conf` | nginx SPA routing config |
| `docker-compose.yml` | Orchestrates both containers together |
| `backend/.dockerignore` | Keeps `.env`, `agents.db`, `__pycache__` out of the image |
| `frontend/.dockerignore` | Keeps `node_modules` and `dist` out of the build context |

One small code change: `backend/database.py` now reads `DB_PATH` from an env var (defaults to `agents.db`). Docker passes `DB_PATH=/data/agents.db` and mounts a volume there so the database survives container restarts.

---

## How Each File Works

### backend/Dockerfile

```dockerfile
FROM python:3.12-slim          # ~50MB base vs ~900MB for the full image

WORKDIR /app

COPY requirements.txt .        # Copy deps FIRST — enables layer caching
RUN pip install --no-cache-dir -r requirements.txt

COPY . .                       # Source code copied after deps

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why copy `requirements.txt` before source code?**
Docker builds in layers. If `requirements.txt` hasn't changed, Docker skips the `pip install` step entirely on the next build. Only changed layers and everything after them are re-run. So changing a `.py` file doesn't reinstall packages.

**Why `0.0.0.0`?**
Inside a container, `localhost` refers to the container itself. `0.0.0.0` means "listen on all interfaces" — required so Docker can route traffic into it from the host.

---

### frontend/Dockerfile (multi-stage)

```dockerfile
# Stage 1 — build the React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json .
RUN npm ci                     # Cleaner than npm install for reproducible builds
COPY . .
RUN npm run build              # Outputs static files to /app/dist

# Stage 2 — serve with nginx
FROM nginx:alpine              # Fresh image — no Node.js, no source code, no node_modules
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why multi-stage?**
The final image only contains the compiled output (`/dist`) served by nginx. No Node.js runtime, no `node_modules`, no source files. Result: **26 MB** instead of 500 MB+.

**Why `nginx.conf`?**
React Router handles routing client-side. But if a user refreshes on `/agents/123/chat`, nginx tries to find that file on disk — it doesn't exist — and returns a 404. The `try_files $uri $uri/ /index.html` directive tells nginx: if the file doesn't exist, always serve `index.html` and let React Router take over.

---

### docker-compose.yml

```yaml
services:
  backend:
    build: ./backend           # Path to Dockerfile
    ports:
      - "8000:8000"            # host_port:container_port
    env_file:
      - ./backend/.env         # Loads ANTHROPIC_API_KEY — no secrets in compose file
    environment:
      - DB_PATH=/data/agents.db
    volumes:
      - agents-data:/data      # Named volume — persists the SQLite DB

  frontend:
    build: ./frontend
    ports:
      - "3000:80"              # Host port 3000 → nginx port 80 inside container
    depends_on:
      - backend                # Starts backend container first

volumes:
  agents-data:                 # Docker manages this volume — survives container restarts
```

**Key points:**
- `env_file` loads the existing `backend/.env` — you never paste secrets into the compose file
- Named volumes (`agents-data`) persist even if you run `docker compose down`. Only `docker compose down -v` deletes them.
- `depends_on` only guarantees start order, not that the backend is *ready*. For production you'd add a healthcheck.

---

## Commands Used & What They Do

### Build and start everything (first time)
```bash
docker compose up --build
```
- Builds both images from their Dockerfiles
- Starts both containers
- Streams logs to the terminal
- `--build` forces a rebuild even if images already exist

### Rebuild one service after a code change
```bash
docker compose build frontend
docker compose up -d frontend
```
- `build frontend` — re-runs only the frontend Dockerfile
- `up -d frontend` — tears down the old frontend container, starts a new one in the background
- `-d` = detached (runs in background, returns your terminal)

### Everyday commands
```bash
# Start everything in background (images already built)
docker compose up -d

# Stop and remove containers (volumes kept)
docker compose down

# Stop containers AND delete volumes (wipes the DB)
docker compose down -v

# Stream logs from all services
docker compose logs -f

# Stream logs from one service
docker compose logs -f backend

# Rebuild everything and restart
docker compose up --build -d

# Check what's running
docker ps

# Shell into a running container
docker exec -it ai-agent-platform-backend-1 bash

# Check image sizes
docker images | grep ai-agent
```

---

## The Build Flow

```
Write Dockerfile
       │
       ▼
docker compose build [service]
       │
       ├── Docker reads the Dockerfile top to bottom
       ├── Each instruction = one layer
       ├── Unchanged layers = pulled from cache (fast)
       └── Changed layers + everything after = rebuilt
       │
       ▼
docker compose up -d [service]
       │
       ├── Stops old container
       ├── Starts new container from the new image
       └── Maps ports, mounts volumes, injects env vars
       │
       ▼
Running stack
       ├── backend: uvicorn on 0.0.0.0:8000 → host :8000
       └── frontend: nginx on 0.0.0.0:80 → host :3000
```

## Layer Caching in Practice

| What changed | pip install cached? | npm ci cached? |
|---|---|---|
| `.py` source file | ✅ yes | — |
| `requirements.txt` | ❌ reruns | — |
| React component | — | ✅ yes |
| `package.json` | — | ❌ reruns |

This is why both Dockerfiles copy the dependency manifest (`requirements.txt` / `package*.json`) *before* copying source code.
