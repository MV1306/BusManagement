pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'

        VITE_API_BASE   = 'https://192.168.29.141/TransitOpsAPI/api'

        API_APPPOOL     = 'TransitOpsAPI'
        UI_APPPOOL      = 'TransitOpsUI'
        API_DEPLOY_PATH = 'C:\\inetpub\\wwwroot\\TransitOpsAPI'
        UI_DEPLOY_PATH  = 'C:\\inetpub\\wwwroot\\TransitOpsUI'
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
                            booleanParam(name: 'BUILD_API', defaultValue: true, description: '.NET API'),
                            booleanParam(name: 'BUILD_UI',  defaultValue: true, description: 'React UI')
                        ]
                    )
                    env.BUILD_API = selection.BUILD_API.toString()
                    env.BUILD_UI  = selection.BUILD_UI.toString()
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
                dir('BusManagement.UI') {
                    bat '''
                        if exist node_modules rd /s /q node_modules
                        npm ci --include=dev
                    '''
                }
            }
        }

        stage('UI - Lint') {
            when { expression { env.BUILD_UI == 'true' } }
            steps {
                dir('BusManagement.UI') { bat 'npx oxlint .' }
            }
        }

        stage('UI - Build') {
            when { expression { env.BUILD_UI == 'true' } }
            steps {
                dir('BusManagement.UI') {
                    bat 'npx tsc -b'
                    bat 'npx vite build'
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
            }
        }
    }

    post {
        success { echo 'Pipeline completed successfully.' }
        failure { echo 'Pipeline failed. Check the logs above.' }
        always  { cleanWs() }
    }
}
