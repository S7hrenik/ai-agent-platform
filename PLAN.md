# AI Agent Platform — Build Plan

## Project Goal

A platform where users can create, configure, and run AI agents.
Each agent has its own system prompt (personality/behavior), skill documents, and isolated chat sessions.
Demonstrates: FastAPI, React, Docker, Kubernetes, Jenkins CI/CD — the full SDE 2 stack.

## Product

- Users create agents with a name, description, and system prompt
- Each agent behaves differently based on its system prompt
- Skill documents can be attached to any agent — injected as context on every message
- Chat sessions are isolated per agent
- Agents + docs persist to SQLite (survive server restarts)
- Light / dark mode

## Stack

- **Backend:** Python + FastAPI + SQLite
- **AI:** Anthropic Claude Haiku (`claude-haiku-4-5-20251001`)
- **Frontend:** React + React Router (Vite)
- **Infra:** Docker + Kubernetes (minikube)
- **CI/CD:** Jenkins (runs in Docker)

## Notes

- API key is in `backend/.env` (never commit this)
- Python 3.14 installed — use unpinned deps to get latest wheels
- No time limit — build it right
- Frontend proxies all API calls through nginx (`/api/...`) — no hardcoded localhost URLs

---

## Phase 1 — Backend ✅ DONE

**What was built:**

- `backend/main.py` — FastAPI app with full REST API:
  - `GET  /health`
  - `POST /agents` — create agent `{name, description, system_prompt}`
  - `GET  /agents` — list all agents
  - `GET  /agents/{id}` — get one agent
  - `PUT  /agents/{id}` — update agent
  - `DELETE /agents/{id}` — delete agent
  - `POST /agents/{id}/chat` — chat `{message, session_id}`
  - `GET  /agents/{id}/docs` — list skill docs
  - `POST /agents/{id}/docs` — add skill doc `{title, content}`
  - `DELETE /agents/{id}/docs/{doc_id}` — remove skill doc
  - `GET  /agents/{id}/history/{session_id}`
  - `DELETE /agents/{id}/session/{session_id}`
- `backend/agent.py` — Claude Haiku agent, sessions keyed by `(agent_id, session_id)`, injects skill docs into system prompt
- `backend/database.py` — SQLite, agents + docs tables, `ON DELETE CASCADE`, `DB_PATH` from env var
- `backend/start.py` — loads `.env` then starts uvicorn with hot reload

**How to run:**

```
cd ai-agent-platform/backend
python start.py
```

---

## Phase 2 — Frontend ✅ DONE

**What was built:**

- React + Vite + React Router, sidebar layout (dark nav + light/dark main panel)
- `src/components/Sidebar.jsx` — persistent agent list, active state, edit/delete on hover
- `src/components/Avatar.jsx` — color-coded initials avatar (color derived from name)
- `src/hooks/useTheme.js` — light/dark mode, respects `prefers-color-scheme`, persists to localStorage
- `src/pages/Welcome.jsx` — landing screen with gradient hero
- `src/pages/AgentForm.jsx` — create + edit agent (shared component, tips for system prompts)
- `src/pages/Chat.jsx` — chat UI with animated typing dots, skill docs drawer (slide-in)
- `src/api.js` — all API calls in one place, base URL proxied through `/api`

**Design:** White + blue (light), dark grey + blue (dark). Blue accent throughout.

**How to run:**

```
cd ai-agent-platform/frontend
npm run dev
```

Runs on `http://localhost:5173`

---

## Phase 3 — Docker ✅ DONE

**What was built:**

- `backend/Dockerfile` — `python:3.12-slim`, layer-cached pip install, uvicorn CMD
- `frontend/Dockerfile` — multi-stage: `node:20-alpine` builds → `nginx:alpine` serves
- `frontend/nginx.conf` — SPA routing (`try_files`) + reverse proxy for `/api/` → backend
- `docker-compose.yml` — backend + frontend services, named volume for SQLite persistence
- `backend/.dockerignore`, `frontend/.dockerignore`
- `DOCKER_REFERENCE.md` — full explanation of every file and command

**How to run:**

```
docker compose up --build        # first time
docker compose up -d             # subsequent runs
docker compose down              # stop
```

Frontend on `:3000`, backend on `:8000`

---

## Phase 4 — Kubernetes ✅ DONE

**What was built:**

- minikube cluster (Docker driver, Kubernetes v1.35.1)
- `k8s/configmap.yaml` — DB_PATH env config
- `k8s/backend-pvc.yaml` — 1Gi PVC for SQLite persistence
- `k8s/backend-deployment.yaml` — Deployment + ClusterIP Service, liveness/readiness probes, resource limits
- `k8s/frontend-deployment.yaml` — Deployment + NodePort Service
- K8s secret created from `.env` file (never committed): `kubectl create secret generic backend-secret --from-env-file=./backend/.env`

**How to run:**

```powershell
$env:PATH += ";C:\Users\Dell"
minikube start
minikube image load ai-agent-platform-backend:latest
minikube image load ai-agent-platform-frontend:latest
kubectl create secret generic backend-secret --from-env-file=./backend/.env
kubectl apply -f k8s/configmap.yaml -f k8s/backend-pvc.yaml -f k8s/backend-deployment.yaml -f k8s/frontend-deployment.yaml
minikube service frontend --url   # open in browser
```

---

## Phase 5 — Jenkins CI/CD ✅ DONE

**What was built:**

- `backend/test_main.py` — 18 pytest tests (health, agent CRUD, docs CRUD, chat with mocked API)
- `Jenkinsfile` — 4-stage declarative pipeline:
  1. **Test** — runs all 18 tests (Python installed in Jenkins container)
  2. **Build** — builds `shrenik762/ai-agent-backend` and `shrenik762/ai-agent-frontend`
  3. **Push** — pushes both images to Docker Hub with build number + latest tags
  4. **Deploy** — `kubectl apply` + `kubectl rollout restart` to K8s cluster
- Jenkins runs in Docker with Docker socket + project dir + kubeconfig mounted

**How to restart Jenkins after reboot:**

```powershell
docker start jenkins
# Refresh kubeconfig if minikube IP changes:
$env:PATH += ";C:\Users\Dell"
minikube start
minikube kubectl -- config view --flatten | Out-File -Encoding utf8 "$env:TEMP\kubeconfig"
(Get-Content "$env:TEMP\kubeconfig" -Raw) -replace 'https://127\.0\.0\.1:\d+','https://192.168.49.2:8443' | Out-File -Encoding utf8 "$env:TEMP\kubeconfig"
docker cp "$env:TEMP\kubeconfig" jenkins:/var/jenkins_home/.kube/config
```

---

## Phase 6 — Polish & Hardening ✅ DONE

**What was built:**

- Backend Pydantic validators — name (max 100), description (max 500), system prompt (min 10 / max 10k), doc title/content limits
- Loading skeletons in sidebar and chat header (shimmer animation)
- Inline form validation with per-field errors and character counter on system prompt
- Running Chrome dino replaces typing dots when agent is thinking
- ChatGPT-style centered input bar (max-width 720px, send button inside)
- `k8s/hpa.yaml` — HorizontalPodAutoscaler (frontend scales 1→3 replicas at 70% CPU)

---

## Phase 7 — GitHub & README ✅ DONE

**What was built:**

- `README.md` — project overview, ASCII architecture diagram, tech stack table, prerequisites, run instructions (local / Docker / K8s / Jenkins), API reference
- `k8s/secret.yaml` added to `.gitignore` — prevents API key from being committed
- History rewritten to remove secrets from initial commit
- Pushed to https://github.com/S7hrenik/ai-agent-platform

---

## File Structure (end state)

```
ai-agent-platform/
  backend/
    main.py
    agent.py
    database.py
    start.py
    requirements.txt
    test_main.py
    Dockerfile
    .dockerignore
    .env               ← never commit
    .env.example
    agents.db          ← never commit
  frontend/
    src/
      components/
        Avatar.jsx
        Sidebar.jsx
      hooks/
        useTheme.js
      pages/
        Welcome.jsx
        AgentForm.jsx
        Chat.jsx
      api.js
      App.jsx
      App.css
    Dockerfile
    .dockerignore
    nginx.conf
  k8s/
    secret.yaml
    configmap.yaml
    backend-pvc.yaml
    backend-deployment.yaml
    frontend-deployment.yaml
  Jenkinsfile
  docker-compose.yml
  DOCKER_REFERENCE.md
  README.md
  PLAN.md
```
