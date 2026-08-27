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
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Select Components') {
            steps {
                script {
                    def selection = input(
                        message: 'Select components to build and deploy',
                        parameters: [
                            booleanParam(name: 'BUILD_API',    defaultValue: true,  description: '.NET API'),
                            booleanParam(name: 'BUILD_UI',     defaultValue: true,  description: 'React UI'),
                            booleanParam(name: 'BUILD_INDIC',  defaultValue: false, description: 'IndicTrans2 Python service')
                        ]
                    )
                    env.BUILD_API   = selection.BUILD_API   .toString()
                    env.BUILD_UI    = selection.BUILD_UI    .toString()
                    env.BUILD_INDIC = selection.BUILD_INDIC .toString()
                }
            }
        }

        stage('API - Restore') {
            when { expression { env.BUILD_API == 'true' } }
            steps {
                dir('BusManagement.API') { bat 'dotnet restore' }
            }
        }

        stage('API - Build') {
            when { expression { env.BUILD_API == 'true' } }
            steps {
                dir('BusManagement.API') { bat 'dotnet build --no-restore -c Release' }
            }
        }

        stage('API - Publish') {
            when { expression { env.BUILD_API == 'true' } }
            steps {
                dir('BusManagement.API') { bat 'dotnet publish --no-build -c Release -o ../publish/api' }
            }
        }

        stage('UI - Install') {
            when { expression { env.BUILD_UI == 'true' } }
            steps {
                dir('BusManagement.UI') { bat 'npm ci' }
            }
        }

        stage('UI - Lint') {
            when { expression { env.BUILD_UI == 'true' } }
            steps {
                dir('BusManagement.UI') { bat 'npx oxlint' }
            }
        }

        stage('UI - Build') {
            when { expression { env.BUILD_UI == 'true' } }
            steps {
                dir('BusManagement.UI') { bat 'npx tsc -b && npx vite build' }
            }
        }

        stage('Archive Artifacts') {
            steps {
                script {
                    if (env.BUILD_API   == 'true') archiveArtifacts artifacts: 'publish/api/**',            fingerprint: true
                    if (env.BUILD_UI    == 'true') archiveArtifacts artifacts: 'BusManagement.UI/dist/**',  fingerprint: true
                    if (env.BUILD_INDIC == 'true') archiveArtifacts artifacts: 'indictrans_service/**',     fingerprint: true
                }
            }
        }

        stage('Deploy') {
            parallel {
                stage('Deploy API') {
                    when { expression { env.BUILD_API == 'true' } }
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
                    when { expression { env.BUILD_UI == 'true' } }
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
                    when { expression { env.BUILD_INDIC == 'true' } }
                    steps {
                        bat """
                            @echo off
                            set SVC=${IT2_SERVICE_NAME}
                            set DEPLOY=${IT2_DEPLOY_PATH}
                            set VENV_PY=${IT2_VENV_PYTHON}
                            set PY311=C:\\Users\\manoj\\AppData\\Local\\Programs\\Python\\Python311\\python.exe

                            REM Tear down any existing service regardless of state
                            sc query "%SVC%" >nul 2>&1
                            if not errorlevel 1 (
                                sc stop "%SVC%" >nul 2>&1
                                timeout /t 5 /nobreak >nul
                                nssm remove "%SVC%" confirm
                            )

                            REM Copy service files
                            if not exist "%DEPLOY%" mkdir "%DEPLOY%"
                            xcopy /E /Y /I indictrans_service\\* "%DEPLOY%\\"

                            REM Create logs dir
                            if not exist "%DEPLOY%\\logs" mkdir "%DEPLOY%\\logs"

                            REM Create venv and install deps if not already done
                            if not exist "%VENV_PY%" (
                                "%PY311%" -m venv "%DEPLOY%\\venv"
                                "%DEPLOY%\\venv\\Scripts\\pip" install --no-cache-dir transformers==4.46.3 torch fastapi "uvicorn[standard]" sentencepiece sacremoses
                            )

                            REM Register service fresh every deploy
                            nssm install "%SVC%" "%VENV_PY%" -m uvicorn main:app --host 127.0.0.1 --port 5100
                            nssm set "%SVC%" AppDirectory "%DEPLOY%"
                            nssm set "%SVC%" AppEnvironmentExtra HF_HUB_ENABLE_HF_TRANSFER=1
                            nssm set "%SVC%" Start SERVICE_AUTO_START
                            nssm set "%SVC%" AppStdout "%DEPLOY%\\logs\\service.log"
                            nssm set "%SVC%" AppStderr "%DEPLOY%\\logs\\service.log"

                            REM Start service
                            nssm start "%SVC%"
                        """
                    }
                }
            }
        }
    }

    post {
        success { echo 'Pipeline completed successfully.' }
        failure { echo 'Pipeline failed. Check the logs above.' }
        always  { cleanWs() }
    }
}
