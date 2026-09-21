# Intelligent Customer Complaint Classification & Resolution System

A web app where customers raise and track complaints, agents work through a priority queue and send replies, and admins see analytics on a dashboard. Each new complaint is automatically tagged with a category, sentiment, priority and a suggested reply.

## Project structure

| Folder | What it contains |
|---|---|
| `client/` | React (Vite) frontend |
| `server/` | Node + Express API with MongoDB |
| `ai-service/` | Python FastAPI service for classification and suggested replies |
| `e2e-tests/` | End-to-end tests with Selenium |
| `k8s/` | Kubernetes manifests for Minikube |

## Run locally

Requirements: Node.js 20+ and Python 3.11+.

**Server** (http://localhost:4000)

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

**AI service** (http://127.0.0.1:8000)

```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --app-dir src/main/python --host 127.0.0.1 --port 8000 --env-file .env
```

**Client** (http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

## Tests

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

## Continuous integration

A `Jenkinsfile` at the repo root runs the server, client and ai-service test suites in parallel on every push, each in its own throwaway Docker container (`node:20-alpine` / `python:3.11-slim`) so the Jenkins host itself doesn't need Node or Python installed. A failing test fails the build.

To set this up on a Jenkins instance:

1. Install the **Docker Pipeline** plugin (for the `agent { docker { ... } }` blocks) and the **GitHub Branch Source** plugin.
2. New Item → **Multibranch Pipeline**, point it at this repo's URL, and set the script path to `Jenkinsfile` (the default).
3. Under the GitHub repo's Settings → Webhooks, add a webhook to `<your-jenkins-url>/github-webhook/` so a push triggers the pipeline automatically - or enable "GitHub hook trigger for GITScm polling" on the job if the webhook is already set up org-wide.
4. No credentials are needed for the test stage today - the test suites mock all external calls. When a later stage needs real credentials (registry push, deploy), add them under **Manage Jenkins → Credentials** and reference them by ID in the `Jenkinsfile`; never put a real secret in the file itself.

## Contributing

Branch names, commit messages and the merge steps are in [CONTRIBUTING.md](CONTRIBUTING.md).
