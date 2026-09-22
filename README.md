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

## Tests

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

## Continuous integration

A `Jenkinsfile` at the repo root runs four stages on every push: **Test** (server, client and ai-service suites, in parallel, each in its own throwaway Docker container so the Jenkins host itself doesn't need Node or Python installed), **Build images** (server, client and ai-service Docker images, tagged with the commit SHA so a deployed image can always be traced back to the commit it came from), **Scan** (`npm audit` for server and client, `pip-audit` for ai-service, and a Trivy image scan of all three, all running in parallel), and **Deploy** (`kubectl apply` of the `k8s/` manifests, then `kubectl set image` to point each Deployment at the newly built image, then `kubectl rollout status` so a pod that never becomes ready fails the build instead of reporting success).

A failing test, a HIGH/CRITICAL dependency finding, or a HIGH/CRITICAL image vulnerability stops the pipeline before anything is deployed. **Deploy only runs on `main`** - feature branches are tested, built and scanned, but never touch the running cluster.

To set this up on a Jenkins instance:

1. Install the **Docker Pipeline** plugin (for the `agent { docker { ... } }` blocks) and the **GitHub Branch Source** plugin.
2. New Item → **Multibranch Pipeline**, point it at this repo's URL, and set the script path to `Jenkinsfile` (the default).
3. Under the GitHub repo's Settings → Webhooks, add a webhook to `<your-jenkins-url>/github-webhook/` so a push triggers the pipeline automatically - or enable "GitHub hook trigger for GITScm polling" on the job if the webhook is already set up org-wide.
4. Under **Manage Jenkins → Credentials**, add two credentials, referenced by ID in the `Jenkinsfile` and never written into it directly:
   - `google-client-id` (Secret text) - the same public `VITE_GOOGLE_CLIENT_ID` value used elsewhere; it isn't a secret, but keeping it out of the file avoids hardcoding an environment-specific value.
   - `kubeconfig` (Secret file) - a kubeconfig with access to the target cluster, used only by the Deploy stage.
5. The Jenkins host needs `minikube` and `kubectl` on its `PATH` and access to the Docker socket the images were built on, since `minikube image load` copies images from the host's Docker daemon into the cluster's.

## Contributing

Branch names, commit messages and the merge steps are in [CONTRIBUTING.md](CONTRIBUTING.md).
