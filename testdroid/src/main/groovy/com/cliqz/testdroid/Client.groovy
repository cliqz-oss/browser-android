package com.cliqz.testdroid

import com.testdroid.api.APIFilter.APIFilterItem
import com.testdroid.api.APIList
import com.testdroid.api.APIQueryBuilder
import com.testdroid.api.DefaultAPIClient
import com.testdroid.api.model.APIDeviceSession
import com.testdroid.api.model.APIProject
import com.testdroid.api.model.APITestRun
import com.testdroid.api.model.APIUser

class Client {

    final static SUCCESS_ERROR_CODE = 0
    final static NO_TEST_ERROR_CODE = 1
    final static TOO_MANY_TEST_FAILURES_ERROR_CODE = 2

    final static float SUCCESS_RATIO_THRESHOLD = 0.95

    final ANDROID_FILE_MIME_TYPE = "application/vnd.android.package-archive"
    final API_URL = 'https://cloud.testdroid.com'
    private final params = [:]

    static def android = APIProject.Type.ANDROID
    static def xc = APIProject.Type.XCTEST

    Client() {
        params['deviceGroup'] = 14
        params['testType'] = android
    }

    def methodMissing(String name, args) {
        params.put(name, args[0])
    }

    def propertyMissing(String name) {
        final value = params[name]
        if (!value) {
            throw new MissingPropertyException(name, this.class)
        }
        value
    }

    static def log(msg, closure) {
        print "${msg}... "
        def result = closure()
        println 'DONE'
        result
    }

    @SuppressWarnings("GrReassignedInClosureLocalVar")
    def getProject(me) {
        APIProject project
        log("Check project if project ${params.project} exists") {
            APIQueryBuilder builder = new APIQueryBuilder();
            APIFilterItem item = new APIFilterItem(APIFilterItem.Type.S,
                    'name', APIFilterItem.Operand.EQ, params.project)
            builder.filter([item])
            project = me.getProjectsResource(builder).entity.find { APIProject pr ->
                pr.name == params.project
            }
        }
        if (project == null) {
            project = log("Creating project ${params.project}") {
                me.createProject(params.testType, params.project)
            }
        }
        project
    }

    // Project id: 109335866
    // Test run: 109336945
    def execute() {
        final client = new DefaultAPIClient(API_URL, params['username'], params['password'])
        final APIUser me = log('Logging in') { client.me() }
        // A project is typically a branch
        final APIProject project = getProject(me)
        log('Updating configuration') {
            final config = project.testRunConfig
            config.instrumentationRunner = 'com.cliqz.browser.test.CustomTestRunner'
            config.timeout = 600000
            if (params.deviceGroup) {
                try {
                    config.usedDeviceGroupId = params.deviceGroup as Long
                    config.usedDeviceGroupName = ""
                } catch (ignored) {
                    config.usedDeviceGroupName = params.deviceGroup
                    config.usedDeviceGroupId = 0
                }
            }
            config.update()
        }
        def mimetype
        if (params.testType == android) {
            mimetype = ANDROID_FILE_MIME_TYPE
        } else {
            mimetype = 'application/octet-stream'
        }

        log('Uploading APK_IPA') {
            project.uploadApplication(new File(params.appFile), mimetype)
        }
        log('Uploading test APK_ZIP') {
            project.uploadTest(new File(params.testFile), mimetype)
        }
        print 'Running tests'
        final testRun = params.testRun ?
                project.run(params.testRun) : project.run()

        // Wait for test completion
        def abortTime = System.currentTimeMillis() + 1800000L;
        while (testRun.state != APITestRun.State.FINISHED) {
            sleep(10000)
            print '.'
            testRun.update()
            def now = System.currentTimeMillis();
            if (testRun.runningDeviceCount == 0 && abortTime - now < 0) {
                testRun.abort()
                break;
            }
            if (testRun.runningDeviceCount > 0) {
                abortTime = System.currentTimeMillis() + 600000L;
            }
        }
        println ' DONE'
        if (testRun.finishedDeviceCount == 0) {
            return NO_TEST_ERROR_CODE
        }
        testRun.deviceSessions.iterator().findAll({ session ->
            session.state == APIDeviceSession.State.SUCCEEDED
        }).each { session ->
            final deviceName = session.device.displayName
            final dst = new File(params.artifactsFolder, "${deviceName}.zip")
            dst.delete()
            dst.append(session.outputFiles)
        }
        if (testRun.successRatio < SUCCESS_RATIO_THRESHOLD) {
            TOO_MANY_TEST_FAILURES_ERROR_CODE
        } else {
            SUCCESS_ERROR_CODE
        }
    }

    /**
     * Execute the tests on testdroid platform using the given configuration
     *
     * @param closure the configuration closure
     * @return 0 if success, some value > 0 in case of error
     */
    static client(closure) {
        final cl = new Client()
        closure.delegate = cl;
        closure()
        cl.execute()
    }

    static {
        APIUser.metaClass.getProjects = { -> projectsResource.entity }

        APIProject.metaClass.getTestRuns = { -> testRunsResource.entity }

        APITestRun.metaClass.getFiles = { -> filesResource.entity }
        APITestRun.metaClass.getDeviceSessions { -> deviceSessionsResource.entity }

        APIList.metaClass.iterator = {
            def list = delegate as APIList
            def iter = list.data.iterator()
            [
                    hasNext: { ->
                        if (iter.hasNext()) {
                            true
                        } else if (list.nextAvailable) {
                            list = list.nextItems
                            iter = list.data.iterator()
                            iter.hasNext()
                        } else {
                            false
                        }
                    },
                    next: { -> iter.next() }
            ] as Iterator
        }
    }
}
