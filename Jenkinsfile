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
                    // PyBuilder creates its own build/test venvs and installs
                    // requirements.txt into those directly, so the CPU-only
                    // torch index is configured in build.py itself (via
                    // install_dependencies_extra_index_url) rather than here -
                    // installing torch into this outer container first never
                    // reached pyb's isolated venvs and just wasted time.
                    agent { docker { image 'python:3.11-slim'; args '-u root:root' } }
                    steps {
                        dir('ai-service') {
                            sh 'pip install --no-cache-dir pybuilder==0.13.23'
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
                    // --pull fetches the newest base image, and OS_PATCH_DATE
                    // re-runs the OS upgrade step once a day, so a cached
                    // layer can never hide a security fix from the scan below.
                    sh '''
                        PATCH=$(date +%Y-%m-%d)
                        docker build --pull --build-arg OS_PATCH_DATE=$PATCH -t complaint-server:$TAG ./server
                        docker build --pull --build-arg OS_PATCH_DATE=$PATCH -t complaint-ai-service:$TAG ./ai-service
                        docker build --pull --build-arg OS_PATCH_DATE=$PATCH \
                            --build-arg VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
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

        stage('E2E (Selenium)') {
            // Render deploys the connected branch by itself on every push
            // (see render.yaml), so Jenkins no longer has a deploy step.
            // This drives the real browser flows (register, log in, submit a
            // complaint) against the live Render site. It first waits for
            // the server to answer, because a free Render service sleeps
            // after 15 minutes without traffic.
            when { branch 'main' }
            agent any
            environment {
                APP_URL = 'https://complaint-triage-web-jvl8.onrender.com'
            }
            steps {
                sh '''
                    for i in $(seq 1 30); do
                        curl -sf "$APP_URL/api/health" && break
                        sleep 10
                    done
                    cd e2e-tests
                    python3 -m venv .venv
                    . .venv/bin/activate
                    pip install --no-cache-dir -r requirements.txt
                    CLIENT_BASE_URL=$APP_URL \
                    SERVER_BASE_URL=$APP_URL \
                        python -m unittest discover -p "*_tests.py" -v
                '''
            }
        }
    }
}
