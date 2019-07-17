package com.cliqz.gradle

import okhttp3.MediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import org.apache.commons.io.FileUtils
import org.gradle.api.DefaultTask
import org.gradle.api.tasks.TaskAction
import groovy.json.JsonSlurper

import java.nio.charset.StandardCharsets

class TestDroidTask extends DefaultTask {

    def env = System.getenv()
    String projectId = env['PROJECT_ID']
    String apIKey = env['API_KEY']
    String frameworkId = env['FRAMEWORK_ID']
    String deviceGroupId = env['DEVICE_GROUP_ID']


    final PROJECT_ID = projectId
    final API_KEY = apIKey
    final FRAMEWORK_ID = frameworkId
    final DEVICE_GROUP_ID = deviceGroupId

    final OkHttpClient client = new OkHttpClient()
    final slurper = new JsonSlurper()

    @TaskAction
    def connectTestdroid() {
        // 1. Does the project identified by the id param exists? Decide yourself how to pass this param
        final url = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}")
        final request = url.openConnection()
        request.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
        if (request.responseCode == HttpURLConnection.HTTP_OK) {
            logger.info("Project exists")
        } else {
            logger.error("No project for the given id: ${PROJECT_ID}")
            throw new Exception('Error occurred: Specify a project ID that exists')
        }
        // 2. Upload the 2 apks and store the ids
        final apkID = uploadFile("/Users/kiizajosephbazaare/browser-android/app/build/outputs/apk/cliqz/debug/app-cliqz-arm64-v8a-debug.apk")
        final testsID = uploadFile("/Users/kiizajosephbazaare/browser-android/app/build/outputs/apk/androidTest/cliqz/debug/app-cliqz-debug-androidTest.apk")
        // 3. Create the testrun and run it
        final runID = performTestRun(apkID, testsID)
        // 4. Poll every minute (os so) to check the job finished
        String state = pollTestRunStatus(runID)
        int timeTaken = 0
        while (state!= "FINISHED"){
            sleep(60000)
            timeTaken+=1
            state = pollTestRunStatus(runID)
        }
        logger.info("Tests finished in ${timeTaken} minutes")
        // 5. Download the artifacts and put them in a predefined folder (where Azure/Jenkins can find it)
        fetchTestRunArtifacts(runID)
        // 6. log error if any test failed, otherwise just return
        Float successRatio = errorLogger(runID)
        if (successRatio >= 0.9999){
            logger.info("Test Run was successful")
            println("Test Run was successful")
        }else if (successRatio < 1  && successRatio > 0.90){
            logger.info("Need to get session success Ratios")
            Float sessionSuccessRatio = sessionErrorLogger(runID)
            if (sessionSuccessRatio < 0.50 && sessionSuccessRatio > 0.000){
                logger.error("Need to check tests that are failing")
                throw new Exception('Tests are failing')
            }else {
               logger.info("Test run was not 100% successful but that's okay")
            }
        }
    }

    def getBasicAuth(String apiKey) {
        "${apiKey}:".bytes.encodeBase64().toString()
    }

    def uploadFile(String filepath){
        final file = new File(filepath)
        final mediaType = MediaType.parse('application/octet-stream')
        def requestBody = new MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart('file', file.name, RequestBody.create(file, mediaType))
            .build()
        def request = new Request.Builder()
            .header('Authorization', "Basic ${getBasicAuth(API_KEY)}")
            .url("https://cloud.bitbar.com/api/me/files")
            .post(requestBody)
            .build()
        final response = client.newCall(request).execute()
        if (!response.isSuccessful()) throw new IOException("Unexpected file" + response.code)
        final json = slurper.parseText(response.body.string())
        json.id
    }

    def performTestRun(long appFileID, long testFileID){
        final mediaType = MediaType.parse('application/json')
        final content = """
            {
                "osType":"ANDROID",
                "projectId":"$PROJECT_ID",
                "files":[
                    {"id":"$appFileID"},
                    {"id":"$testFileID"}
                ],
                "frameworkId":"$FRAMEWORK_ID",
                "deviceGroupId":"$DEVICE_GROUP_ID"
            }""".stripIndent()

        def request = new Request.Builder()
            .header('Authorization', "Basic ${getBasicAuth(API_KEY)}")
            .url("https://cloud.bitbar.com/api/me/runs")
            .post(RequestBody.create(content, mediaType))
            .build()
        final response = client.newCall(request).execute()
        if (!response.isSuccessful()) throw new IOException("Test run not possible " + response.code)
        final testRun = slurper.parseText(response.body.string())
        response.close()
        testRun.id
    }

    def pollTestRunStatus(long testID){
        final poll = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}/runs/${testID}")
        final check = poll.openConnection()
        check.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
        if (check.responseCode == HttpURLConnection.HTTP_OK){
            final pollStatus = slurper.parseText (check.content.text)
            pollStatus.state
        } else {
            logger.error("No Test Run for the given id: ${testID}")
        }
    }

    def fetchTestRunArtifacts(long testRunID){
        final url = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}/runs/${testRunID}/device-sessions")
        final sessions = url.openConnection()
        sessions.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
        new File("./artifacts").eachFile {file ->
            if (file.name.contains(".zip")) file.delete()
        }
        if (sessions.responseCode == HttpURLConnection.HTTP_OK){
            final sessionResults = slurper.parse(sessions.inputStream)
            sessionResults.data.each{ session ->
                println "Device: ${session.device.displayName} ID: ${session.id} SuccessRatio: ${session.successRatio}"
                if (session.successRatio < 1){
                    def request = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}/runs/${testRunID}/device-sessions/${session.id}/output-file-set/files.zip")
                    final artifact = request.openConnection()
                    artifact.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
                    println "Getting Artifacts for Device: ${session.device.displayName}"
                    new File("./artifacts/${session.id}.zip").withOutputStream { out ->
                        artifact.inputStream.with { inp ->
                            out << inp
                        }
                    }
                    if (artifact.responseCode == HttpURLConnection.HTTP_OK) {
                        logger.info("Artifacts downloaded")
                        println("Artifacts downloaded")
                    } else {
                        logger.error("Files for Session ${session.id} are not available")
                    }
                }else {
                    logger.info("Tests runs on ${session.device.displayName} were successful ")
                }
            }
        } else{
            logger.error("No session data for test run ${testRunID}")
        }
    }

    def errorLogger(long testRunID){
        final url = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}/runs/${testRunID}")
        final testRun = url.openConnection()
        testRun.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
        if (testRun.responseCode == HttpURLConnection.HTTP_OK) {
            final testRunResult = slurper.parse(testRun.inputStream)
            testRunResult.successRatio
        }
        else {
            logger.error("No Test Run for the given id: ${testRunID}")
        }
    }

    def sessionErrorLogger(long testRunID){
        final url = new URL("https://cloud.bitbar.com/api/me/projects/${PROJECT_ID}/runs/${testRunID}/device-sessions")
        final sessions = url.openConnection()
        sessions.setRequestProperty('Authorization', "Basic ${getBasicAuth(API_KEY)}")
        if (sessions.responseCode == HttpURLConnection.HTTP_OK) {
            final sessionResults = slurper.parse(sessions.inputStream)
            sessionResults.data.each { session ->
                println "Device: ${session.device.displayName} ID: ${session.id} SuccessRatio: ${session.successRatio}"
                if (session.successRatio < 0.5 && session.successRatio != null){
                    logger.error("Tests are failing on ${session.displayName}")
                    session.successRatio
                }else if(session.successRatio == null){
                    logger.error("Tests did not run on this device")
                    session.successRatio = 0
                    session.successRatio
                }else {
                    logger.info("Tests are failing but that's okay")
                    session.successRatio
                }
            }
            sessionResults.successRatio
        }
    }
}
