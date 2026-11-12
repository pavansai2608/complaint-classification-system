# Complaint Triage & Resolution System

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

## Run with Docker

Requirements: Docker and Docker Compose.

```bash
cp .env.example .env
cp server/.env.example server/.env
cp ai-service/.env.example ai-service/.env
# fill in the real values in each .env file (JWT secrets, Google client ID,
# Gemini API key) - see the comments in each .env.example for where to get them
docker compose up --build
```

This starts MongoDB, the server (http://localhost:4000), the ai-service (http://localhost:8000) and the client (http://localhost:8080) together, all talking to each other over the compose network. No secrets are baked into any image - each service reads its own `.env` file at container start, and the client's Google Client ID (the only frontend value, and a public identifier, not a secret) is passed in as a build arg from the root `.env`.

## Run on Minikube

Requirements: Minikube and kubectl.

```bash
minikube start
minikube addons enable ingress

# Build the images inside Minikube's own Docker daemon (not your host's),
# so no image registry or push step is needed.
eval $(minikube docker-env)
docker build -t complaint-server:local ./server
docker build -t complaint-ai-service:local ./ai-service
docker build --build-arg VITE_GOOGLE_CLIENT_ID=<your-client-id> -t complaint-client:local ./client

# Config and secrets
cp k8s/secret.example.yaml k8s/secret.yaml
# edit k8s/secret.yaml with real values: pick a MONGO_ROOT_USERNAME/PASSWORD
# (used by both Mongo itself and the MONGODB_URI values), JWT secrets,
# AI_SERVICE_KEY (same value in both secrets) and the Gemini API key
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml

# Everything else
kubectl apply -f k8s/mongo-init.yaml
kubectl apply -f k8s/mongo.yaml -f k8s/server.yaml -f k8s/ai-service.yaml -f k8s/client.yaml

# Open the app. On Linux, Minikube's IP is reachable directly:
echo "$(minikube ip) complaint.local" | sudo tee -a /etc/hosts
# then open http://complaint.local
```

On macOS the Docker driver runs the cluster inside a VM whose IP the host
can't reach, so the line above won't work there. Either run `minikube tunnel`
in a second terminal and point `complaint.local` at `127.0.0.1` instead, or
skip the Ingress entirely and forward the client Service:

```bash
kubectl port-forward svc/client 8080:8080
# then open http://localhost:8080
```

Check everything came up with `kubectl get pods` (all should be `Running`) and `kubectl get ingress`. `complaint-config` (ConfigMap) holds non-secret settings; secrets come from `k8s/secret.yaml`, which is never committed.

Credentials are scoped so that no component holds more than it needs. Mongo requires authentication (no anonymous access) and, on first startup, `k8s/mongo-init.yaml` creates two users: `complaint_app` with `readWrite` for the server, and `complaint_ai` with `read` only for the ai-service, which just looks up similar past complaints. The root user exists only to create those two. In the same spirit, `complaint-server-secrets` holds the JWT signing keys while `complaint-ai-secrets` does not — the ai-service is the one component handling untrusted complaint text, so a compromise there can neither forge tokens nor write to the database. Mongo's data lives in a PersistentVolumeClaim so it survives pod restarts.

Note that the init script only runs when the data directory is empty. If you change the user passwords later, delete the claim (`kubectl delete pvc mongo-data`) to force a fresh initialisation — this wipes the database.

## Run on Render

`render.yaml` deploys the client and the server on Render's free plan. The client is a static site that forwards `/api/*` to the server, so the browser still talks to one address and the login cookie works as before. MongoDB is a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, because Render has no MongoDB.

1. In Atlas, create a free cluster and a database user. Under Network Access, allow `0.0.0.0/0` (Render's free plan has no fixed outbound IP). Copy the connection string and add `/complaint_system` before the `?`.
2. In Render, choose **New → Blueprint**, connect this GitHub repository and pick the branch. Render reads `render.yaml` and asks for the values marked `sync: false`:
   - `MONGODB_URI` - the Atlas string from step 1.
   - `CLIENT_ORIGIN` - the client address, e.g. `https://complaint-triage-web-jvl8.onrender.com`.
   - `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` - the same OAuth Client ID. In Google Cloud Console, add the client address above to its **Authorized JavaScript origins**.
   - `AI_SERVICE_URL` and `AI_SERVICE_KEY` - leave empty unless the ai-service is deployed (below).
3. After the first deploy, check the server's address in the Render dashboard. Render adds a short suffix to each name (here `-jvl8`). If it is different, change the `/api/*` destination in `render.yaml` and push. Do the same for `CLIENT_ORIGIN` if the client got a suffix.
4. Create the first admin from your machine against the Atlas database: `cd server && MONGODB_URI='<atlas string>' ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node src/scripts/createAdmin.js`.

Check it with `curl https://complaint-triage-server-jvl8.onrender.com/api/health`, which should return `"database":"connected"`.

**Limits of the free plan.** A free service sleeps after 15 minutes without traffic, and the first request after that takes about a minute while it wakes. Pushes to the connected branch redeploy automatically.

**The ai-service.** It is left out of `render.yaml` because PyTorch and the DistilBERT model need about 1.5 GB of memory, and free instances have 512 MB. Without it, complaints are still saved, with a default priority and no suggested reply. To add it, create a **Web Service** from this repository with Docker as the runtime, root directory `ai-service`, an instance with at least 2 GB of memory (a paid plan), and the variables from `ai-service/.env.example` plus `PORT=8000` and the Atlas `MONGODB_URI`. Then set `AI_SERVICE_URL` (its `https://...onrender.com` address) and the same `AI_SERVICE_KEY` on the server, and raise `AI_SERVICE_TIMEOUT_MS` to `30000` so a sleeping service has time to wake.

## Tests

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

## Continuous integration

A `Jenkinsfile` at the repo root runs on every push: **Test** (server, client and ai-service suites, in parallel, each in its own throwaway Docker container so the Jenkins host itself doesn't need Node or Python installed), **Build images** (server, client and ai-service Docker images, tagged with the commit SHA so a deployed image can always be traced back to the commit it came from), **Scan** (`npm audit` for server and client, `pip-audit` for ai-service, and a Trivy image scan of all three, all running in parallel), and **E2E (Selenium)** (drives the real browser flows against the live Render site). There is no deploy stage: Render redeploys the connected branch by itself on every push (see [Run on Render](#run-on-render)).

A failing test, a HIGH/CRITICAL dependency finding, or a HIGH/CRITICAL image vulnerability fails the pipeline. **E2E only runs on `main`**; feature branches are tested, built and scanned.

To set this up on a Jenkins instance:

1. Install the **Docker Pipeline** plugin (for the `agent { docker { ... } }` blocks) and the **GitHub Branch Source** plugin.
2. New Item → **Multibranch Pipeline**, point it at this repo's URL, and set the script path to `Jenkinsfile` (the default).
3. Under the GitHub repo's Settings → Webhooks, add a webhook to `<your-jenkins-url>/github-webhook/` so a push triggers the pipeline automatically - or enable "GitHub hook trigger for GITScm polling" on the job if the webhook is already set up org-wide.
4. Under **Manage Jenkins → Credentials**, add `google-client-id` (Secret text) - the same public `VITE_GOOGLE_CLIENT_ID` value used elsewhere; it isn't a secret, but keeping it out of the file avoids hardcoding an environment-specific value.
5. The Jenkins host needs `curl` and `python3` on its `PATH` and access to the Docker socket.

## Contributing

Branch names, commit messages and the merge steps are in [CONTRIBUTING.md](CONTRIBUTING.md).
