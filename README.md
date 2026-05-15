# AI Agent Platform

A full-stack platform to create, configure, and chat with custom AI agents — each with its own personality, skill documents, and isolated session history.

Built as a portfolio project demonstrating the complete SDE 2 stack: FastAPI · React · Docker · Kubernetes · Jenkins CI/CD.

---

## Features

- **Custom agents** — give each agent a name, description, and system prompt that defines its personality and expertise
- **Skill documents** — attach reference docs to any agent; they're injected as context on every message
- **Isolated sessions** — each agent maintains its own conversation history
- **Light / dark mode** — respects system preference, persists to localStorage
- **Persistent storage** — SQLite database survives container and pod restarts via volume mounts

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser                                  │
│                   React + Vite (port 80)                        │
└────────────────────────┬────────────────────────────────────────┘
                         │  /api/* proxied by nginx
┌────────────────────────▼────────────────────────────────────────┐
│                    nginx (frontend pod)                         │
│         serves SPA   +   proxies /api/ → backend:8000          │
└────────────────────────┬────────────────────────────────────────┘
                         │  ClusterIP service
┌────────────────────────▼────────────────────────────────────────┐
│                  FastAPI backend (port 8000)                    │
│     agent CRUD · skill docs · chat sessions · /health          │
│                         │                                       │
│              ┌──────────┴───────────┐                          │
│          SQLite (PVC)      Anthropic Claude API                 │
└─────────────────────────────────────────────────────────────────┘

CI/CD
──────
Git commit → Jenkins pipeline
  1. Test   — pytest (18 tests, mocked API)
  2. Build  — docker build backend + frontend
  3. Push   — docker push → Docker Hub (shrenik762/*)
  4. Deploy — kubectl apply + rollout restart
```

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Backend    | Python 3.12, FastAPI, SQLite, Pydantic  |
| AI         | Anthropic Claude Haiku                  |
| Frontend   | React 18, React Router, Vite            |
| Containers | Docker, Docker Compose                  |
| Orchestration | Kubernetes (minikube), HPA           |
| CI/CD      | Jenkins (Docker), pytest                |

---

## Prerequisites

- Python 3.10+
- Node.js 20+
- Docker Desktop
- kubectl
- minikube
- An [Anthropic API key](https://console.anthropic.com/)

---

## Running Locally (dev)

```bash
# 1. Clone
git clone https://github.com/S7hrenik/ai-agent-platform.git
cd ai-agent-platform

# 2. Backend
cd backend
cp .env.example .env          # add your ANTHROPIC_API_KEY
python start.py               # http://localhost:8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

---

## Running with Docker

```bash
# Add your API key to backend/.env first
docker compose up --build     # first run
docker compose up -d          # subsequent runs
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000

---

## Running on Kubernetes (minikube)

```bash
# Start cluster
minikube start

# Build images
docker build -t ai-agent-platform-backend:latest ./backend
docker build -t ai-agent-platform-frontend:latest ./frontend

# Load into minikube
minikube image load ai-agent-platform-backend:latest
minikube image load ai-agent-platform-frontend:latest

# Create secret (never commit your .env)
kubectl create secret generic backend-secret --from-env-file=./backend/.env

# Apply manifests
kubectl apply -f k8s/configmap.yaml \
              -f k8s/backend-pvc.yaml \
              -f k8s/backend-deployment.yaml \
              -f k8s/frontend-deployment.yaml \
              -f k8s/hpa.yaml

# Open in browser
minikube service frontend
```

---

## CI/CD Pipeline (Jenkins)

Jenkins runs in Docker and automatically tests, builds, pushes, and deploys on every commit.

```bash
# Start Jenkins
docker run -d --name jenkins \
  -p 8080:8080 \
  -e JAVA_OPTS="-Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true" \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$(pwd):/home/project" \
  jenkins/jenkins:lts
```

Then configure a **Pipeline script from SCM** job pointing at `file:///home/project` with `Jenkinsfile` as the script path. Add a `dockerhub-credentials` credential (username + password/token).

**Pipeline stages:**

| Stage  | What it does                                         |
|--------|------------------------------------------------------|
| Test   | Runs 18 pytest tests with mocked Anthropic calls     |
| Build  | Builds `shrenik762/ai-agent-backend` and `*-frontend`|
| Push   | Pushes `:latest` + `:<build_number>` to Docker Hub  |
| Deploy | `kubectl apply` + `rollout restart` on minikube      |

---

## Project Structure

```
ai-agent-platform/
├── backend/
│   ├── main.py          # FastAPI routes
│   ├── agent.py         # Claude Haiku sessions
│   ├── database.py      # SQLite CRUD
│   ├── test_main.py     # pytest suite (18 tests)
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/  # Sidebar, Avatar, Dino
│   │   ├── hooks/       # useTheme
│   │   └── pages/       # Welcome, AgentForm, Chat
│   ├── nginx.conf       # SPA routing + /api/ proxy
│   └── Dockerfile       # multi-stage node→nginx
├── k8s/
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── configmap.yaml
│   ├── backend-pvc.yaml
│   └── hpa.yaml         # HorizontalPodAutoscaler
├── Jenkinsfile          # 4-stage CI/CD pipeline
└── docker-compose.yml
```

---

## API Reference

| Method | Endpoint                          | Description          |
|--------|-----------------------------------|----------------------|
| GET    | /health                           | Health check         |
| POST   | /agents                           | Create agent         |
| GET    | /agents                           | List agents          |
| GET    | /agents/:id                       | Get agent            |
| PUT    | /agents/:id                       | Update agent         |
| DELETE | /agents/:id                       | Delete agent         |
| POST   | /agents/:id/chat                  | Send message         |
| GET    | /agents/:id/docs                  | List skill docs      |
| POST   | /agents/:id/docs                  | Add skill doc        |
| DELETE | /agents/:id/docs/:doc_id          | Delete skill doc     |
| GET    | /agents/:id/history/:session_id   | Get chat history     |
