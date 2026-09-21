pipeline {
    agent none

    options {
        timestamps()
        // A stuck test run shouldn't hang the pipeline forever.
        timeout(time: 20, unit: 'MINUTES')
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
    }
}
