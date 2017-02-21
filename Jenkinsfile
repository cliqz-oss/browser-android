#!/bin/env groovy

node('ubuntu && docker') {
  def imageName = 'android-browser'

  stage('Checkout') {
    checkout scm
  }

  sh "`aws ecr get-login --region=us-east-1`"

  stage('Build docker image') {
    docker.build(imageName, ".")
  }

  docker.image(imageName).inside {
    stage('Compile') {
      sh './gradlew clean assembleDebug'
    }
    
    /*
    stage('Lint Xwalk version') {
      sh './gradlew lintXwalkFatDebug'
    }

    stage('Lint Standard version') {
      sh './gradlew lintStandardFatDebug'
    }
    */

    stage('Test') {
      sh './gradlew testStandardFatDebug'

      step([
        $class: 'JUnitResultArchiver',
        allowEmptyResults: false,
        testResults: 'app/build/test-results/standardFatDebug/*.xml',
      ])
    }
  }
}
