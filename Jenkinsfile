pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'shrenik762'
        BACKEND_IMAGE   = "${DOCKER_HUB_USER}/ai-agent-backend"
        FRONTEND_IMAGE  = "${DOCKER_HUB_USER}/ai-agent-frontend"
        IMAGE_TAG       = "${BUILD_NUMBER}"
        IS_MAIN         = "${env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master'}"
    }

    stages {

        // ── 1. TEST ────────────────────────────────────────────────────────
        stage('Test') {
            steps {
                echo "Running backend tests (branch: ${env.BRANCH_NAME})..."
                sh '''
                    cd backend
                    pip3 install --quiet --break-system-packages -r requirements.txt pytest httpx
                    ANTHROPIC_API_KEY=test-key-not-used-in-ci python -m pytest test_main.py -v --tb=short
                '''
            }
            post {
                always {
                    echo 'Tests complete.'
                }
            }
        }

        // ── 2. BUILD ───────────────────────────────────────────────────────
        stage('Build') {
            steps {
                echo "Building images — tag: ${IMAGE_TAG}"
                sh 'docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} -t ${BACKEND_IMAGE}:latest ./backend'
                sh 'docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} -t ${FRONTEND_IMAGE}:latest ./frontend'
            }
        }

        // ── 3. PUSH — main branch only ────────────────────────────────────
        stage('Push') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                echo 'Pushing images to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh 'echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin'
                    sh 'docker push ${BACKEND_IMAGE}:${IMAGE_TAG}'
                    sh 'docker push ${BACKEND_IMAGE}:latest'
                    sh 'docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}'
                    sh 'docker push ${FRONTEND_IMAGE}:latest'
                }
            }
        }

        // ── 4. DEPLOY — main branch only ──────────────────────────────────
        stage('Deploy') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                echo 'Deploying to Kubernetes...'
                sh '''
                    kubectl apply -f k8s/configmap.yaml
                    kubectl apply -f k8s/backend-pvc.yaml
                    kubectl apply -f k8s/backend-deployment.yaml
                    kubectl apply -f k8s/frontend-deployment.yaml
                    kubectl rollout restart deployment/backend deployment/frontend
                    kubectl rollout status deployment/backend --timeout=120s
                    kubectl rollout status deployment/frontend --timeout=120s
                '''
            }
        }
    }

    post {
        success {
            script {
                if (env.BRANCH_NAME == 'main' || env.BRANCH_NAME == 'master') {
                    echo "Pipeline succeeded — build ${BUILD_NUMBER} deployed."
                } else {
                    echo "PR checks passed — Test + Build green. Safe to merge."
                }
            }
        }
        failure {
            echo "Pipeline failed — check the logs above."
        }
    }
}
