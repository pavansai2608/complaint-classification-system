# Complaint Triage System

A web app where customers raise and track complaints, and an admin works through every complaint in order of urgency (most urgent first), reviews the AI analysis and suggested reply, edits and sends it, and sees analytics on a dashboard. There are two roles, customer and admin; the admin cannot submit complaints. Each new complaint is automatically tagged with a category, sentiment, priority and a suggested reply.

## Project structure

| Folder | What it contains |
|---|---|
| `client/` | React (Vite) frontend |
| `server/` | Node + Express API with MongoDB |
| `ai-service/` | Python FastAPI service for classification and suggested replies |
| `e2e-tests/` | End-to-end tests with Selenium |
| `k8s/` | Kubernetes manifests for Minikube |

## Run locally

Requirements: Node.js 24+ and Python 3.11+.

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

**API docs.** With `ENABLE_DOCS=true` in `server/.env` and `ai-service/.env`, Swagger UI opens at http://localhost:4000/api/docs (all 16 Express routes) and http://127.0.0.1:8000/docs (AI service). Log in with `POST /api/auth/login`; the page saves the token into **Authorize** by itself. On the AI service page, select **Authorize** and enter the `AI_SERVICE_KEY`, which is sent as `X-Service-Key`. The pages are off by default.

**Postman.** `postman/` has a collection with all 16 Express routes, both AI service routes, in the same numbered groups and steps as Swagger UI, and a folder of negative tests (400, 401, 403, 404), plus an environment. Import both, set `adminEmail`, `adminPassword` and `aiServiceKey` in the environment, and run the folders from top to bottom. The login requests save their tokens, and the first folder warms up the AI service. Keep real values out of the committed file: `postman/*.local.json` is ignored by git. `baseUrl` is the HTTPS address from [Run on Minikube](#run-on-minikube), because the refresh cookie is only sent over HTTPS there; in Postman, add mkcert's `rootCA.pem` (in the folder `mkcert -CAROOT` prints) under Settings > Certificates > CA certificates. The first AI analysis after a restart loads the model and can take about two minutes.

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

# HTTPS certificate for this machine. mkcert -install asks for your password
# and makes this machine trust certificates from its own local authority.
brew install mkcert
mkcert -install
mkdir -p certs
mkcert -cert-file certs/complaint.pem -key-file certs/complaint-key.pem complaint.localhost complaint.local
kubectl create secret tls complaint-tls --cert=certs/complaint.pem --key=certs/complaint-key.pem

# Open the app
kubectl -n ingress-nginx port-forward svc/ingress-nginx-controller 8443:443
# then open https://complaint.localhost:8443
```

`complaint.localhost` always points at this machine, so it needs no `/etc/hosts` line. `certs/` is ignored by git, and the key of mkcert's local authority must never be shared. For Google Sign-In, add `https://complaint.localhost:8443` to the **Authorized JavaScript origins** in Google Cloud Console.

To open Swagger UI for a local cluster, turn it on and forward the port:

```bash
kubectl set env deployment/server deployment/ai-service ENABLE_DOCS=true
kubectl port-forward svc/server 4000:4000
# then open http://localhost:4000/api/docs
```

The client pod runs two containers: nginx (`client`) and a `log-reader` sidecar that shares its log folder and prints the web traffic. Read it with `kubectl logs deployment/client -c log-reader`.

Check everything came up with `kubectl get pods` (all should be `Running`) and `kubectl get ingress`. `complaint-config` (ConfigMap) holds non-secret settings; secrets come from `k8s/secret.yaml`, which is never committed.

Credentials are scoped so that no component holds more than it needs. Mongo requires authentication (no anonymous access) and, on first startup, `k8s/mongo-init.yaml` creates two users: `complaint_app` with `readWrite` for the server, and `complaint_ai` with `read` only for the ai-service, which just looks up similar past complaints. The root user exists only to create those two. In the same spirit, `complaint-server-secrets` holds the JWT signing keys while `complaint-ai-secrets` does not — the ai-service is the one component handling untrusted complaint text, so a compromise there can neither forge tokens nor write to the database. Mongo's data lives in a PersistentVolumeClaim so it survives pod restarts.

Note that the init script only runs when the data directory is empty. If you change the user passwords later, delete the claim (`kubectl delete pvc mongo-data`) to force a fresh initialisation — this wipes the database.

## Run on Render

`render.yaml` deploys the client, the server and the ai-service on Render's free plan. The client is a static site that forwards `/api/*` to the server, so the browser still talks to one address and the login cookie works as before. MongoDB is a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, because Render has no MongoDB.

1. In Atlas, create a free cluster and a database user. Under Network Access, allow `0.0.0.0/0` (Render's free plan has no fixed outbound IP). Copy the connection string and add `/complaint_system` before the `?`.
2. In Render, choose **New → Blueprint**, connect this GitHub repository and pick the branch. Render reads `render.yaml` and asks for the values marked `sync: false`:
   - `MONGODB_URI` - the Atlas string from step 1.
   - `CLIENT_ORIGIN` - the client address, e.g. `https://complaint-triage-web-jvl8.onrender.com`.
   - `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` - the same OAuth Client ID. In Google Cloud Console, add the client address above to its **Authorized JavaScript origins**.
   - `GEMINI_API_KEY` (ai-service) - from https://aistudio.google.com/apikey, for suggested replies. The reply comes from `gemini-3.5-flash-lite`, or from `gemini-3.6-flash` when that model is busy, both with `thinking_level` set to minimal so a short reply comes back fast. `GROQ_API_KEY` is an optional extra provider; leave it empty if you have none. If none of them answers, the admin gets a fixed template reply, and the ai-service log shows a line such as `gemini reply failed: TimeoutError: ...` with the reason.
   - `AI_SERVICE_URL` (server) - leave empty on the first deploy; after it, set it to the ai-service's address (see step 3).

   `AI_SERVICE_KEY` needs no typing: Render generates it on the ai-service and the server reads the same value. The ai-service also reads `MONGODB_URI` from the server.
3. After the first deploy, check the server's address in the Render dashboard. Render adds a short suffix to each name (here `-jvl8`). If it is different, change the `/api/*` destination in `render.yaml` and push. Do the same for `CLIENT_ORIGIN` if the client got a suffix, and set the server's `AI_SERVICE_URL` to the ai-service's address, e.g. `https://complaint-triage-ai-xxxx.onrender.com`.
4. Create the first admin from your machine against the Atlas database: `cd server && MONGODB_URI='<atlas string>' ADMIN_NAME=... ADMIN_EMAIL=... ADMIN_PASSWORD=... node src/scripts/createAdmin.js`.

Check it with `curl https://complaint-triage-server-jvl8.onrender.com/api/health`, which should return `"database":"connected"`.

**Limits of the free plan.** A free service sleeps after 15 minutes without traffic, and the first request after that takes about a minute while it wakes. Pushes to the connected branch redeploy automatically.

**What the ai-service uses on Render.** It installs `requirements-light.txt` and runs with `EMOTION_BACKEND=lexicon`:

- **Category:** the trained scikit-learn model in `ai-service/models/`.
- **Sentiment:** VADER, a word list with rules for negation, capitals and "!!!" (English), plus complaint wording in `emotion_model.py`: polite words such as "please" and "thank you" score 0, words such as "refund" and "overcharged" score negative, and problem phrases such as "never arrived", "will not load" or "blank screen" make the result negative.
- **Suggested reply:** a draft from Gemini that the admin edits and sends.

Docker, Minikube and local runs use `EMOTION_BACKEND=transformer` (DistilBERT, run inside the service) for the sentiment.

A new complaint is saved and shown to the customer straight away, marked as analysis pending with a Medium priority. The server then asks the ai-service for the analysis in the background, waiting up to `AI_SERVICE_TIMEOUT_MS` (90 s on Render, enough for a sleeping ai-service to wake and for Gemini to write the draft), and fills in the category, sentiment, priority and suggested reply when it arrives. If it does not arrive in time, the complaint stays pending. For any complaint saved without an analysis (including ones from before the ai-service was deployed), the admin opens it and selects **Run AI analysis**. For a complaint that already has an analysis but no reply yet, **Run AI analysis again** gets a new suggestion, for example when the suggested reply is the fixed template. Both call the ai-service again, waiting up to 90 s so a sleeping ai-service can wake, (`POST /api/complaints/:id/analyze`, admin only) and fill in the category, sentiment, priority and suggested reply. A complaint that has been replied to keeps its analysis (409 `ALREADY_REPLIED`).

## Tests

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

## Continuous integration

A `Jenkinsfile` at the repo root runs on every push: **Test** (server, client and ai-service suites, in parallel, each in its own throwaway Docker container so the Jenkins host itself doesn't need Node or Python installed), **Build images** (server, client and ai-service Docker images, tagged with the commit SHA so a deployed image can always be traced back to the commit it came from), **Scan** (`npm audit` for server and client, `pip-audit` for ai-service, and a Trivy image scan of all three, all running in parallel), **Deploy to Minikube** (`main` only: loads the three images into Minikube, sets them on the `server`, `ai-service` and `client` deployments and waits for the rollout), and **E2E (Selenium)** (drives the real browser flows against the live Render site). Render redeploys the connected branch by itself on every push (see [Run on Render](#run-on-render)). When a build fails, Jenkins emails the author of the commit (and the default recipients) a "FAILED" message with a link to the console log, and sends a "FIXED" message when the next build passes again.

A failing test, a HIGH/CRITICAL dependency finding, or a HIGH/CRITICAL image vulnerability fails the pipeline. **E2E only runs on `main`**; feature branches are tested, built and scanned.

To set this up on a Jenkins instance:

1. Install the **Docker Pipeline** plugin (for the `agent { docker { ... } }` blocks) and the **GitHub Branch Source** plugin.
2. New Item → **Multibranch Pipeline**, add a **GitHub** branch source (it handles the webhook) with this repo, discover branches but not pull requests from forks, and set the script path to `Jenkinsfile` (the default).
3. Connect GitHub to a Jenkins on your own machine with ngrok, as described in [GitHub webhook](#github-webhook).
4. Under **Manage Jenkins → Credentials**, add `google-client-id` (Secret text) - the same public `VITE_GOOGLE_CLIENT_ID` value used elsewhere; it isn't a secret, but keeping it out of the file avoids hardcoding an environment-specific value.
5. The Jenkins host needs `curl`, `python3`, `minikube` and `kubectl` on its `PATH`, access to the Docker socket, and a running Minikube cluster set up as in [Run on Minikube](#run-on-minikube).
6. Under **Manage Jenkins → System → Extended E-mail Notification**, set the SMTP server (for Gmail: `smtp.gmail.com`, port 465, Use SSL, with a Gmail App Password as the credential) and the Default Recipients. Set the same server under **E-mail Notification** and use **Test configuration** to check it.

### GitHub webhook

ngrok gives a Jenkins on your own machine a public address, so GitHub can tell it about a push at once. The policy below only lets GitHub's signed webhook requests through; the Jenkins site is not reachable from the internet.

1. Copy `jenkins/ngrok-policy.example.yml` outside the repository and replace `changeme` with the output of `openssl rand -hex 32`.
2. Start ngrok, always with the policy: `ngrok http 8080 --traffic-policy-file <policy file>`
3. In the GitHub repo's **Settings → Webhooks**, add `https://<your ngrok domain>/github-webhook/` with content type `application/json`, the same secret, and the push event.

ngrok must be running for a push to reach Jenkins at once. The job also scans the repository every minute.

## Contributing

Branch names, commit messages and the merge steps are in [CONTRIBUTING.md](CONTRIBUTING.md).
