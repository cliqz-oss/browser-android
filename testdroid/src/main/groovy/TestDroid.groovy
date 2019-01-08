import com.cliqz.testdroid.Client

import static com.cliqz.testdroid.Client.client

/**
 * @author Stefano Pacifici
 */
class TestDroid {
    def cli = new CliBuilder(usage: 'testdroid [options]', header: 'Options:')

    void errorMessage(msg) {
        println msg
        cli.usage()
        System.exit(1)
    }

    static void main(String... args) {
        def testdroid = new TestDroid()
        System.exit(testdroid.run(args))
    }

    static def parseTestType(str) {
        switch (str) {
            case 'xc':
                return Client.xc
            default:
                return Client.android
        }

    }

    // Return a value that you can use as Unix error code (0 success, any other value failure)
    def run(String... args) {
        cli._(longOpt: 'env', 'All parameters are passed trough the environment')
        cli.u(longOpt: 'user', args: 1, argName: 'user name', 'Testdroid username')
        cli._(longOpt: 'help', 'Print this help message')
        cli._(longOpt: 'app', args: 1, argName: 'app path', 'The path of the apk_ipa to test')
        cli._(longOpt: 'tests', args: 1, argName: 'tests path', 'Tha path of the automation tests apk_zip')
        cli.p(longOpt: 'project', args: 1, argName: 'project name', 'Testdroid project name')
        cli.r(longOpt: 'run', args: 1, argName: 'run name', 'Testdroid run name')
        cli.d(longOpt: 'dev', args: 1, argName: 'device group', 'Testdroid devices group to use')
        cli._(longOpt: 'dst', args: 1, argName: 'dest folder', 'Test artifacts destination folder')
        cli.t(longOpt: 'type', args: 1, argName: 'test type', 'The test type (default: android, values: android, xc)')

        def options = cli.parse(args)

        def user
        def pass = null
        def devGroup
        def projectName
        def testRunName
        def appPackage
        def testsPackage
        def dstFolder
        def type

        if (options.help) {
            cli.usage()
            return
        }

        if (options.env) {
            def env = System.getenv()
            user = env['TESTDROID_USER']
            pass = env['TESTDROID_PASS']
            devGroup = env['TESTDROID_DEVICE_GROUP']
            projectName = env['TESTDROID_PROJECT_NAME']
            testRunName = env['TESTDROID_RUN_NAME']
            appPackage = env['APK_IPA']
            testsPackage = env['TEST_APK_ZIP']
            dstFolder = env['ARTIFACTS_FOLDER']
            type = parseTestType(env['TESTDROID_TEST_TYPE'])
        } else {
            user = options.u
            devGroup = options.d
            projectName = options.p
            testRunName = options.r
            appPackage = options.app
            testsPackage = options.tests
            dstFolder = options.dst
            type = parseTestType(options.t)
        }

        // Check parameters
        if (!user) {
            errorMessage 'User name is mandatory'
        }
        if (!projectName) {
            errorMessage 'Project name is required'
        }
        if (!devGroup) {
            devGroup = 14
        }
        if (!checkFile(appPackage)) {
            errorMessage "App file not found ${appPackage}"
        }
        if (!checkFile(testsPackage)) {
            errorMessage "Tests file not found ${testsPackage}"
        }
        if (!testRunName) {
            testRunName = "Run on ${new Date().format("yyyy/MM/dd HH:mm")}"
        }
        if (!options.env) {
            // Try to read the password from the shell
            print "Password: "
            def passwordChars = System.console().readPassword()
            pass = new String(passwordChars)
        } else if (!pass) {
            errorMessage 'Password not present in the environment'
        }

        client {
            username user
            password pass
            // apiKey API_KEY // apiKey(API_KEY)
            project projectName
            testRun testRunName
            deviceGroup devGroup
            testType type
            appFile appPackage
            testFile testsPackage
            artifactsFolder file(dstFolder)
        }
    }

    static boolean checkFile(path) {
        try {
            new File(path).isFile()
        } catch (ignored) {
            false
        }
    }

    static boolean checkFolder(path) {
        try {
            new File(path).isDirectory()
        } catch (ignored) {
            false
        }
    }

    static File file(path) { new File(path) }
}

