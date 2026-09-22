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

## Run on AWS EC2 with k3s

This is the actual production-style deployment (CCS-63) - a single EC2 instance running [k3s](https://k3s.io) (a lightweight Kubernetes distribution), reusing the same `k8s/` manifests as Minikube.

Requirements: an AWS account, the AWS CLI configured (`aws configure`), and an SSH key pair.

```bash
# Security group: SSH from your IP only, HTTP/HTTPS open to everyone
aws ec2 create-key-pair --key-name ccs-ec2-key --query 'KeyMaterial' --output text > ~/.ssh/ccs-ec2-key.pem
chmod 400 ~/.ssh/ccs-ec2-key.pem
SG_ID=$(aws ec2 create-security-group --group-name ccs-ec2-sg --description "CCS-63" --vpc-id <default-vpc-id> --query 'GroupId' --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr "$(curl -s https://checkip.amazonaws.com)/32"
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0

# Launch (use a free-tier-eligible type your account allows - check with
# `aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true`)
aws ec2 run-instances --image-id <ubuntu-22.04-ami-id> --instance-type <free-tier-type> \
  --key-name ccs-ec2-key --security-group-ids "$SG_ID" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":20,"VolumeType":"gp3"}}]'

# Elastic IP, so the address survives stop/start
ALLOC_ID=$(aws ec2 allocate-address --domain vpc --query 'AllocationId' --output text)
aws ec2 associate-address --instance-id <instance-id> --allocation-id "$ALLOC_ID"
```

On the instance:

```bash
ssh -i ~/.ssh/ccs-ec2-key.pem ubuntu@<elastic-ip>
sudo apt-get update -y && sudo apt-get install -y docker.io
curl -sfL https://get.k3s.io | sudo sh -
```

Copy the repo over (excluding `node_modules`, `.git`, and `ai-service/target`, which is PyBuilder's build/venv directory - the build only needs `src/`, `requirements.txt` and the Dockerfile), build the three images with plain `docker build` the same way `client/Dockerfile`, `server/Dockerfile` and `ai-service/Dockerfile` are built anywhere else, then load them into k3s's own containerd (k3s doesn't share Docker's image store, the same reason Minikube needs `minikube image load`):

```bash
sudo docker build -t complaint-server:local ./server
sudo docker build --build-arg VITE_GOOGLE_CLIENT_ID=<your-client-id> -t complaint-client:local ./client
sudo docker build -t complaint-ai-service:local ./ai-service
sudo docker save complaint-server:local complaint-client:local complaint-ai-service:local | sudo k3s ctr images import -
```

**HTTPS.** The deployment uses [sslip.io](https://sslip.io) to get a free hostname (`<ip-with-dashes>.sslip.io`) that resolves to the Elastic IP, and Traefik's built-in ACME resolver issues a real Let's Encrypt certificate for it — no browser warnings, auto-renewed. The Traefik config is applied by the Jenkinsfile during deploy, or can be placed manually:

```bash
sudo tee /var/lib/rancher/k3s/server/manifests/traefik-config.yaml <<'EOF'
apiVersion: helm.cattle.io/v1
kind: HelmChartConfig
metadata:
  name: traefik
  namespace: kube-system
spec:
  valuesContent: |
    additionalArguments:
      - --certificatesresolvers.le.acme.httpchallenge=true
      - --certificatesresolvers.le.acme.httpchallenge.entrypoint=web
      - --certificatesresolvers.le.acme.email=<your-email>
      - --certificatesresolvers.le.acme.storage=/data/acme.json
    persistence:
      enabled: true
      path: /data
      size: 128Mi
EOF
```

**Secrets and config.** Same idea as `k8s/secret.yaml` for Minikube (copy `k8s/secret.example.yaml`, fill in real values, `kubectl apply`).

Then apply everything:

```bash
sudo k3s kubectl apply -f k8s/configmap.yaml -f k8s/mongo-init.yaml
sudo k3s kubectl apply -f k8s/mongo.yaml -f k8s/server.yaml -f k8s/ai-service.yaml -f k8s/client.yaml
sudo k3s kubectl apply -f k8s/ingress-ec2.yaml
```

Open `https://<ip-with-dashes>.sslip.io` — the browser will show the padlock with no warnings. Check pods with `sudo k3s kubectl get pods` - all should be `Running`.

**Cost.** Stopping the instance (`aws ec2 stop-instances --instance-ids <id>`) when it's not being used or demoed costs almost nothing (just the EBS disk, a couple of dollars a month) - only a running instance is billed for compute. The Elastic IP stays attached across stop/start, so nothing needs reconfiguring when you start it again.

## Tests

```bash
cd server && npm test
cd client && npm test
cd ai-service && source .venv/bin/activate && pyb
```

## Continuous integration

A `Jenkinsfile` at the repo root runs on every push: **Test** (server, client and ai-service suites, in parallel, each in its own throwaway Docker container so the Jenkins host itself doesn't need Node or Python installed), **Build images** (server, client and ai-service Docker images, tagged with the commit SHA so a deployed image can always be traced back to the commit it came from), **Scan** (`npm audit` for server and client, `pip-audit` for ai-service, and a Trivy image scan of all three, all running in parallel), **Deploy** (SSHes into the EC2/k3s instance (CCS-63), copies the repo over, builds the three images there and loads them into k3s the same way the README's manual steps above do, then applies the `k8s/` manifests and restarts the deployments), and **E2E (Selenium)** (drives the real browser flows against the app's public HTTPS address, right after it was just deployed).

A failing test, a HIGH/CRITICAL dependency finding, or a HIGH/CRITICAL image vulnerability stops the pipeline before anything is deployed. **Deploy only runs on `main`** - feature branches are tested, built and scanned, but never touch the running instance. The EC2 instance has to actually be running for Deploy to succeed - if it's stopped to save cost between work sessions, a push during that window just fails safely rather than silently deploying nothing.

To set this up on a Jenkins instance:

1. Install the **Docker Pipeline** plugin (for the `agent { docker { ... } }` blocks), the **GitHub Branch Source** plugin, and the **SSH Credentials** plugin (most Jenkins installs already have it).
2. New Item → **Multibranch Pipeline**, point it at this repo's URL, and set the script path to `Jenkinsfile` (the default).
3. Under the GitHub repo's Settings → Webhooks, add a webhook to `<your-jenkins-url>/github-webhook/` so a push triggers the pipeline automatically - or enable "GitHub hook trigger for GITScm polling" on the job if the webhook is already set up org-wide.
4. Under **Manage Jenkins → Credentials**, add these, referenced by ID in the `Jenkinsfile` and never written into it directly:
   - `google-client-id` (Secret text) - the same public `VITE_GOOGLE_CLIENT_ID` value used elsewhere; it isn't a secret, but keeping it out of the file avoids hardcoding an environment-specific value.
   - `ec2-ssh-key` (SSH Username with private key) - the same `ccs-ec2-key.pem` used to SSH into the EC2 instance by hand, username `ubuntu`.
   - `ec2-host` (Secret text) - the EC2 instance's Elastic IP.
5. The Jenkins host needs `ssh` and `rsync` on its `PATH` and access to the Docker socket the images were built on.

## Contributing

Branch names, commit messages and the merge steps are in [CONTRIBUTING.md](CONTRIBUTING.md).
