pipeline {
    agent any

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        NODE_ENV                    = 'development'

        API_APPPOOL     = 'TransitOpsAPI'
        UI_APPPOOL      = 'TransitOpsUI'
        API_DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\TransitOpsAPI'
        UI_DEPLOY_PATH  = 'C:\\inetpub\\wwwroot\\TransitOpsUI'

        IT2_SERVICE_NAME = 'IndicTrans2Svc'
        IT2_DEPLOY_PATH  = 'C:\\services\\indictrans2'
        IT2_VENV_PYTHON  = 'C:\\services\\indictrans2\\venv\\Scripts\\python.exe'
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
                archiveArtifacts artifacts: 'indictrans_service/**', fingerprint: true
            }
        }

        stage('Deploy') {
            parallel {
                stage('Deploy API') {
                    steps {
                        bat """
                            %SystemRoot%\\System32\\inetsrv\\appcmd stop apppool /apppool.name:"${API_APPPOOL}"
                            if exist "${API_DEPLOY_PATH}" rd /s /q "${API_DEPLOY_PATH}"
                            xcopy /E /Y /I publish\\api\\* "${API_DEPLOY_PATH}\\"
                            %SystemRoot%\\System32\\inetsrv\\appcmd start apppool /apppool.name:"${API_APPPOOL}"
                        """
                    }
                }

                stage('Deploy UI') {
                    steps {
                        bat """
                            %SystemRoot%\\System32\\inetsrv\\appcmd stop apppool /apppool.name:"${UI_APPPOOL}"
                            if exist "${UI_DEPLOY_PATH}" rd /s /q "${UI_DEPLOY_PATH}"
                            xcopy /E /Y /I BusManagement.UI\\dist\\* "${UI_DEPLOY_PATH}\\"
                            %SystemRoot%\\System32\\inetsrv\\appcmd start apppool /apppool.name:"${UI_APPPOOL}"
                        """
                    }
                }

                stage('Deploy IndicTrans2') {
                    steps {
                        bat """
                            @echo off

                            REM Stop service if running
                            sc query "${IT2_SERVICE_NAME}" >nul 2>&1 && nssm stop "${IT2_SERVICE_NAME}" confirm

                            REM Copy service files
                            if not exist "${IT2_DEPLOY_PATH}" mkdir "${IT2_DEPLOY_PATH}"
                            xcopy /E /Y /I indictrans_service\\* "${IT2_DEPLOY_PATH}\\"

                            REM Create venv and install deps if not already done
                            if not exist "${IT2_VENV_PYTHON}" (
                                py -3.11 -m venv "${IT2_DEPLOY_PATH}\\venv"
                                "${IT2_DEPLOY_PATH}\\venv\\Scripts\\pip" install --no-cache-dir ^^
                                    "transformers==4.46.3" torch fastapi "uvicorn[standard]" ^^
                                    hf_transfer indictranstoolkit
                            )

                            REM Register as Windows service via NSSM (skip if already registered)
                            sc query "${IT2_SERVICE_NAME}" >nul 2>&1
                            if errorlevel 1 (
                                nssm install "${IT2_SERVICE_NAME}" "${IT2_VENV_PYTHON}" ^^
                                    "-m uvicorn main:app --host 127.0.0.1 --port 5100"
                                nssm set "${IT2_SERVICE_NAME}" AppDirectory "${IT2_DEPLOY_PATH}"
                                nssm set "${IT2_SERVICE_NAME}" AppEnvironmentExtra ^^
                                    "HF_HUB_ENABLE_HF_TRANSFER=1"
                                nssm set "${IT2_SERVICE_NAME}" Start SERVICE_AUTO_START
                                nssm set "${IT2_SERVICE_NAME}" AppStdout "${IT2_DEPLOY_PATH}\\logs\\service.log"
                                nssm set "${IT2_SERVICE_NAME}" AppStderr "${IT2_DEPLOY_PATH}\\logs\\service.log"
                            )

                            REM Start service
                            nssm start "${IT2_SERVICE_NAME}"
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