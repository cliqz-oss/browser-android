#!/bin/env groovy

node('us-east-1 && ubuntu && docker && !gpu') {
    stage('Checkout') {
        checkout scm
    }
    sh "`aws ecr get-login --region=us-east-1 --no-include-email`"
    def apk = "app/build/outputs/apk/standardX86/debug/app-standard-x86-debug.apk"
    def instance_id = sh(returnStdout: true, script: '''
            aws ec2 run-instances --image-id ami-13050368 --count 1 --instance-type t2.medium --key-name android_ci_genymotion --security-group-ids sg-5bbf173f --subnet-id subnet-341ff61f  --region=us-east-1 --query "Instances[].InstanceId" --output text
        ''').trim()
    def ip = sh(returnStdout: true, script: """
            aws ec2 describe-instances --instance-ids $instance_id  --region=us-east-1 --query 'Reservations[].Instances[].PrivateIpAddress' --output text
        """).trim()
    sh "aws ec2 create-tags --resources $instance_id --region=us-east-1 --tag Key=Name,Value='Appium-Genymotion'"
    try{
        withCredentials([file(credentialsId: '48f6d4df-68d9-4b42-9dc3-0e8b90a28b52', variable:'AUTOBOTS_KEY')]) {
            sh '''#!/bin/bash -l
                set -x
                set -e
                mkdir -p ~/.ssh
                rm -f ~/.ssh/id_rsa
                cp $AUTOBOTS_KEY ~/.ssh/id_rsa
                chmod 600 ~/.ssh/id_rsa
                ssh-keyscan -t rsa github.com >> ~/.ssh/known_hosts
            '''
            stage('Checkout Autobots'){
             sh '''
                rm -rf external/autobots
                git submodule update --init --recursive external/autobots
                '''
            }
        }

        def dockerfileChecksum = sh(returnStdout: true, script: 'md5sum Dockerfile | cut -d" " -f1').trim()
        def dockerTag = "${dockerfileChecksum}"
        def baseImageName = "browser-android/build:${dockerTag}"
        stage('Build docker image') {
            docker.withRegistry('https://141047255820.dkr.ecr.us-east-1.amazonaws.com'){
                    try {
                        def image = docker.image(baseImageName)
                        image.pull()
                    } catch (e) {
                        print e
                        def baseImage  = docker.build(baseImageName, '--build-arg UID=`id -u` --build-arg GID=`id -g` .')
                        baseImage.push dockerTag
                    }
            }
        }

        def args = "-v ${pwd}/artifacts:/artifacts:rw"
        docker.image("141047255820.dkr.ecr.us-east-1.amazonaws.com/${baseImageName}").inside(args) {

            stage('Extension') {
              sh '''yarn && npm run dev-bundle'''
            }

            stage('Compile') {
                sh './gradlew --stacktrace clean assembleStandardX86Debug'
            }

            try{
                withEnv(["IP=${ip}", "APP=${apk}", "platformName=android", "deviceName=127.0.0.1:5556"]){
                    withCredentials([file(credentialsId: 'f4141ff9-4dc0-4250-84b5-ef212d4fbb42', variable: 'FILE' )]){
                        stage('Run Tests') {
                            sh '''#!/bin/bash -l
                                npm uninstall -g appium || true
                                npm uninstall wd || true
                            '''
                            timeout(60) {
                                sh'''#!/bin/bash -l
                                    set -x
                                    set -e
                                    chmod 400 $FILE
                                    ssh -v -o StrictHostKeyChecking=no -i $FILE root@$IP "setprop persist.sys.usb.config adb"
                                    ssh -v -o StrictHostKeyChecking=no -i $FILE -NL 5556:127.0.0.1:5555 root@$IP &
                                    ~/android_home/platform-tools/adb connect 127.0.0.1:5556
                                    ~/android_home/platform-tools/adb wait-for-device
                                    npm install -g appium@1.7.1
                                    npm install wd
                                    appium &
                                    export app=$PWD/$APP
                                    cd external/autobots
                                    chmod 0755 requirements.txt
                                    virtualenv ~/venv
                                    source ~/venv/bin/activate
                                    pip install -r requirements.txt
                                    python testRunner.py || true
                               '''
                           }
                        }
                    }
                }
            }
            finally{
                stage('Generate and Upload Results') {
                    archiveArtifacts allowEmptyArchive: true, artifacts: 'external/autobots/*.log'
                    zip archive: true, dir: 'external/autobots/screenshots', glob: '', zipFile: 'external/autobots/screenshots.zip'
                    junit "external/autobots/test-reports/*.xml"
                    def report_folder = sh(returnStdout: true, script: 'echo ${JOB_NAME#cliqz/browser/android-browser/}-${BUILD_NUMBER}').trim()
                    withEnv(["REPORT_FOLDER=${report_folder}"]){
                        sh '''#!/bin/bash -l
                            set -x
                            set -e
                            cd external/autobots/unitth/
                            cp unitth.* ../test-reports/
                            cd ../test-reports/
                            java -jar unitth.jar .
                        '''
                    }
                    zip archive: true, dir: 'external/autobots/test-reports', glob: '', zipFile: 'external/autobots/reports.zip'
                    //s3Upload bucket: 'cdn.cliqz.com', file: '${report_folder}', path: 'mobile/browser/reports/${report_folder}'
                }
                stage('Clean Up') {
                    sh '''#!/bin/bash -l
                        rm -rf node-modules
                        rm -rf jsengine/*
                        npm uninstall -g appium
                        npm uninstall wd
                    '''
                }
            }
        }
    }
    finally{
        sh """#!/bin/bash -l
            set -x
            set -e
            aws ecr get-login --region=us-east-1 --no-include-email
            aws ec2 terminate-instances --instance-ids ${instance_id} --region=us-east-1
        """
    }
}
