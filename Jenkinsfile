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
                    agent { docker { image 'node:20-alpine' } }
                    steps {
                        dir('server') {
                            sh 'npm ci'
                            sh 'npm test'
                        }
                    }
                }

                stage('Client (Vitest)') {
                    agent { docker { image 'node:20-alpine' } }
                    steps {
                        dir('client') {
                            sh 'npm ci'
                            sh 'npm test'
                        }
                    }
                }

                stage('AI service (unittest)') {
                    agent { docker { image 'python:3.11-slim' } }
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
