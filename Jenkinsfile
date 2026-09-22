pipeline {
    agent none

    environment {
        // Images are tagged with the commit they were built from, never
        // "latest", so what's running in the cluster can always be traced
        // back to a commit and rolled back to a previous one.
        TAG = "${env.GIT_COMMIT.take(12)}"
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
                    agent { docker { image 'node:20-alpine'; args '-u root:root' } }
                    steps {
                        dir('server') {
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
            when { branch 'main' }
            agent any
            steps {
                // The kubeconfig is a Jenkins file credential, never a file in
                // the repo. Secrets are applied separately by hand (see the
                // README) - this pipeline does not create or read them.
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        # Minikube runs its own Docker daemon, so images built
                        # on the host have to be copied in before the cluster
                        # can start containers from them.
                        minikube image load complaint-server:$TAG
                        minikube image load complaint-ai-service:$TAG
                        minikube image load complaint-client:$TAG

                        kubectl apply -f k8s/configmap.yaml -f k8s/mongo-init.yaml
                        kubectl apply -f k8s/mongo.yaml -f k8s/server.yaml \
                            -f k8s/ai-service.yaml -f k8s/client.yaml

                        # The manifests carry the :local tag for hand-run
                        # deploys; point each Deployment at the image built
                        # from this exact commit instead.
                        kubectl set image deployment/server server=complaint-server:$TAG
                        kubectl set image deployment/ai-service ai-service=complaint-ai-service:$TAG
                        kubectl set image deployment/client client=complaint-client:$TAG

                        # Fail the build if a new pod never becomes ready,
                        # rather than reporting success on a broken deploy.
                        kubectl rollout status deployment/server --timeout=300s
                        kubectl rollout status deployment/ai-service --timeout=600s
                        kubectl rollout status deployment/client --timeout=300s
                    '''
                }
            }
        }
    }
}
