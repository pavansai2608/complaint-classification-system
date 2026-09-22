pipeline {
    agent none

    environment {
        // Images are tagged with the commit they were built from, never
        // "latest", so what's running in the cluster can always be traced
        // back to a commit and rolled back to a previous one.
        //
        // GIT_COMMIT is null during a lightweight "branch indexing" run
        // (Jenkins evaluating this file's structure without a real SCM
        // checkout), so this has to tolerate that instead of crashing the
        // whole pipeline before any stage runs.
        TAG = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : 'unknown'}"
    }

    options {
        timestamps()
        // A stuck test run shouldn't hang the pipeline forever. This is
        // generous because the ai-service stage installs torch and lets
        // PyBuilder build fresh virtualenvs on every run, which takes far
        // longer than the other two suites.
        timeout(time: 60, unit: 'MINUTES')
    }

    stages {
        stage('Test') {
            parallel {
                stage('Server (Jest + Supertest)') {
                    // Jenkins runs the container as the host user, who owns
                    // nothing in the image (no writable $HOME, so npm's
                    // cache dir fails). Root is fine here - the container is
                    // thrown away at the end of the stage.
                    //
                    // Debian-based (not Alpine) and forced to amd64: the
                    // integration test spins up mongodb-memory-server, which
                    // downloads a real mongod binary. There is no official
                    // MongoDB build for Alpine's musl libc, and - on this
                    // arm64 Jenkins host - no official arm64 build for
                    // Debian either (only Ubuntu), so this runs the
                    // container emulated as amd64, where Debian builds are
                    // always published. On an amd64 host this is a no-op.
                    agent { docker { image 'node:20-slim'; args '-u root:root --platform=linux/amd64' } }
                    steps {
                        dir('server') {
                            // mongod needs libcurl at runtime; node:20-slim
                            // doesn't include it.
                            sh 'apt-get update -qq && apt-get install -y -qq libcurl4'
                            sh 'npm ci'
                            sh 'npm test'
                        }
                    }
                }

                stage('Client (Vitest)') {
                    agent { docker { image 'node:20-alpine'; args '-u root:root' } }
                    steps {
                        dir('client') {
                            sh 'npm ci'
                            sh 'npm test'
                        }
                    }
                }

                stage('AI service (unittest)') {
                    agent { docker { image 'python:3.11-slim'; args '-u root:root' } }
                    steps {
                        dir('ai-service') {
                            sh 'pip install --no-cache-dir -r requirements-dev.txt'
                            sh 'pyb'
                        }
                    }
                }
            }
        }

        stage('Build images') {
            agent any
            steps {
                // Built on the host daemon so Trivy can scan them over the
                // Docker socket in the next stage; they are loaded into
                // Minikube at deploy time. The Google Client ID is public
                // (it only identifies the OAuth app) but still comes from
                // Jenkins rather than being hardcoded here.
                withCredentials([string(credentialsId: 'google-client-id',
                                        variable: 'GOOGLE_CLIENT_ID')]) {
                    sh '''
                        docker build -t complaint-server:$TAG ./server
                        docker build -t complaint-ai-service:$TAG ./ai-service
                        docker build --build-arg VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
                            -t complaint-client:$TAG ./client
                    '''
                }
            }
        }

        stage('Scan') {
            parallel {
                stage('Dependencies') {
                    agent any
                    steps {
                        // --omit=dev because only runtime dependencies ship in
                        // the images; a dev-only advisory shouldn't block a
                        // deploy. Both exit non-zero on a high/critical finding.
                        dir('server') { sh 'npm audit --audit-level=high --omit=dev' }
                        dir('client') { sh 'npm audit --audit-level=high --omit=dev' }
                        dir('ai-service') {
                            sh '''
                                docker run --rm -v "$PWD:/ws" -w /ws python:3.11-slim \
                                    sh -c "pip install --no-cache-dir -q pip-audit && \
                                           pip-audit -r requirements.txt"
                            '''
                        }
                    }
                }

                stage('Images (Trivy)') {
                    agent any
                    steps {
                        // Trivy runs as a container so the Jenkins host needs
                        // nothing installed, and reads the images through the
                        // host's Docker socket - the same daemon that built
                        // them. --ignore-unfixed keeps the gate actionable:
                        // it only fails on vulnerabilities there is a patch
                        // for. --exit-code 1 is what actually fails the build.
                        sh '''
                            for image in complaint-server complaint-ai-service complaint-client; do
                                docker run --rm \
                                    -v /var/run/docker.sock:/var/run/docker.sock \
                                    -v trivy-cache:/root/.cache/trivy \
                                    aquasec/trivy:latest image \
                                        --severity HIGH,CRITICAL \
                                        --ignore-unfixed \
                                        --exit-code 1 \
                                        "$image:$TAG"
                            done
                        '''
                    }
                }
            }
        }

        stage('Deploy') {
            // Only main deploys. Feature branches still get tested, built and
            // scanned, but must not touch the running cluster.
            //
            // Targets the EC2/k3s box (CCS-63), not Minikube - Minikube only
            // ever existed on one person's laptop, so it was never a real
            // deployment target. k3s doesn't share a Docker daemon with this
            // Jenkins host, so instead of loading a locally-built image in,
            // this builds the images directly on the EC2 box over SSH - the
            // same commands a person would run by hand (see the README),
            // just scripted. The instance has to be running for this to
            // succeed; if it's stopped to save cost between sessions, this
            // stage just fails safely rather than deploying nothing silently.
            when { branch 'main' }
            agent any
            steps {
                withCredentials([
                    sshUserPrivateKey(credentialsId: 'ec2-ssh-key', keyFileVariable: 'EC2_SSH_KEY', usernameVariable: 'EC2_SSH_USER'),
                    string(credentialsId: 'ec2-host', variable: 'EC2_HOST'),
                    string(credentialsId: 'google-client-id', variable: 'GOOGLE_CLIENT_ID'),
                ]) {
                    sh '''
                        SSH="ssh -i $EC2_SSH_KEY -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15"

                        tar --exclude='./.git' --exclude='./ai-service/target' \
                            --exclude='./ai-service/__pycache__' \
                            --exclude='./server/node_modules' --exclude='./client/node_modules' \
                            --exclude='./client/dist' -czf /tmp/ccs-deploy.tar.gz .
                        rsync -az -e "$SSH" /tmp/ccs-deploy.tar.gz $EC2_SSH_USER@$EC2_HOST:/home/$EC2_SSH_USER/ccs-deploy.tar.gz

                        $SSH $EC2_SSH_USER@$EC2_HOST "
                            rm -rf ~/app && mkdir -p ~/app && tar -xzf ccs-deploy.tar.gz -C ~/app && rm ccs-deploy.tar.gz
                            cd ~/app
                            sudo docker build -t complaint-server:local ./server
                            sudo docker build -t complaint-ai-service:local ./ai-service
                            sudo docker build --build-arg VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID -t complaint-client:local ./client
                            sudo docker save complaint-server:local complaint-ai-service:local complaint-client:local | sudo k3s ctr images import -

                            # Traefik ACME config for auto-renewing Let's Encrypt certs
                            sudo tee /var/lib/rancher/k3s/server/manifests/traefik-config.yaml <<TRAEFIKCFG
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
      - --certificatesresolvers.le.acme.email=golipavansaikrishna2608@gmail.com
      - --certificatesresolvers.le.acme.storage=/data/acme.json
    persistence:
      enabled: true
      path: /data
      size: 128Mi
TRAEFIKCFG

                            sudo k3s kubectl apply -f k8s/configmap.yaml -f k8s/mongo-init.yaml
                            sudo k3s kubectl apply -f k8s/mongo.yaml -f k8s/server.yaml -f k8s/ai-service.yaml -f k8s/client.yaml
                            sudo k3s kubectl apply -f k8s/ingress-ec2.yaml

                            sudo k3s kubectl rollout restart deployment/server deployment/ai-service deployment/client
                            sudo k3s kubectl rollout status deployment/server --timeout=300s
                            sudo k3s kubectl rollout status deployment/ai-service --timeout=600s
                            sudo k3s kubectl rollout status deployment/client --timeout=300s
                        "
                    '''
                }
            }
        }

        stage('E2E (Selenium)') {
            // Drives the real browser flows (register, log in, submit a
            // complaint) against the app that was just deployed above, over
            // its real public HTTPS address - the same way a person would
            // use it. No port-forward needed now that the deploy target is
            // a reachable EC2 box rather than a local-only Minikube cluster.
            when { branch 'main' }
            agent any
            steps {
                withCredentials([string(credentialsId: 'ec2-host', variable: 'EC2_HOST')]) {
                    sh '''
                        cd e2e-tests
                        python3 -m venv .venv
                        . .venv/bin/activate
                        pip install --no-cache-dir -r requirements.txt
                        SSLIP_HOST=$(echo $EC2_HOST | tr '.' '-').sslip.io
                        CLIENT_BASE_URL=https://$SSLIP_HOST \
                        SERVER_BASE_URL=https://$SSLIP_HOST \
                            python -m unittest discover -p "*_tests.py" -v
                    '''
                }
            }
        }
    }
}
