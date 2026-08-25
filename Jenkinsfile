pipeline {
    agent any

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        NODE_ENV                    = 'development'

        API_APPPOOL     = 'TransitOpsAPI'
        UI_APPPOOL      = 'TransitOpsUI'
        API_DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\TransitOpsAPI'
        UI_DEPLOY_PATH  = 'C:\\inetpub\\wwwroot\\TransitOpsUI'
    }

    stages {
        stage('API - Restore') {
            steps {
                dir('BusManagement.API') {
                    bat 'dotnet restore'
                }
            }
        }

        stage('API - Build') {
            steps {
                dir('BusManagement.API') {
                    bat 'dotnet build --no-restore -c Release'
                }
            }
        }

        stage('API - Publish') {
            steps {
                dir('BusManagement.API') {
                    bat 'dotnet publish --no-build -c Release -o ../publish/api'
                }
            }
        }

        stage('UI - Install') {
            steps {
                dir('BusManagement.UI') {
                    bat 'npm ci'
                }
            }
        }

        stage('UI - Lint') {
            steps {
                dir('BusManagement.UI') {
                    bat 'npx oxlint'
                }
            }
        }

        stage('UI - Build') {
            steps {
                dir('BusManagement.UI') {
                    bat 'npx tsc -b && npx vite build'
                }
            }
        }

        stage('Archive Artifacts') {
            steps {
                archiveArtifacts artifacts: 'publish/api/**', fingerprint: true
                archiveArtifacts artifacts: 'BusManagement.UI/dist/**', fingerprint: true
            }
        }

        stage('Deploy') {
            parallel {
                stage('Deploy API') {
                    steps {
                        bat """
                            %SystemRoot%\\System32\\inetsrv\\appcmd stop apppool /apppool.name:"${API_APPPOOL}"
                            xcopy /E /Y /I publish\\api\\* "${API_DEPLOY_PATH}\\"
                            %SystemRoot%\\System32\\inetsrv\\appcmd start apppool /apppool.name:"${API_APPPOOL}"
                        """
                    }
                }

                stage('Deploy UI') {
                    steps {
                        bat """
                            %SystemRoot%\\System32\\inetsrv\\appcmd stop apppool /apppool.name:"${UI_APPPOOL}"
                            xcopy /E /Y /I BusManagement.UI\\dist\\* "${UI_DEPLOY_PATH}\\"
                            %SystemRoot%\\System32\\inetsrv\\appcmd start apppool /apppool.name:"${UI_APPPOOL}"
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully.'
        }

        failure {
            echo 'Pipeline failed. Check the logs above.'
        }

        always {
            cleanWs()
        }
    }
}