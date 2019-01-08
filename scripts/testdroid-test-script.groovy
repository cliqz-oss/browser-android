/**
 * This script help us to migrate testdroid API from version to version
 */
@Grab('com.testdroid:testdroid-api:2.39')
import com.testdroid.api.DefaultAPIClient
import com.testdroid.api.model.APIUser
import com.testdroid.api.model.APIProject
import com.testdroid.api.model.APITestRun
import com.testdroid.api.model.APIDeviceSession
import com.testdroid.api.APIList

// Add some convinience meta-method
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

final API_URL = 'https://cloud.testdroid.com'

print 'Username: '
final username = System.console().readLine()
print 'Password: '
final password = System.console().readPassword()

final client = new DefaultAPIClient(API_URL, username, password.toString())
final APIUser me = client.me()
final projects = me.projects.iterator().collect()

// List projects
println "Projects"
projects.eachWithIndex { project, index ->
    println "${index} - ${project.name}"
}

print "${System.lineSeparator()}Pick one: "
final proj = projects[System.console().readLine().toInteger()]

final testruns = proj.testRuns.iterator().take(10).collect()
println "Last ten test runs"
testruns.eachWithIndex { testrun, index ->
    println "${index} - ${testrun.displayName}"
}

print "${System.lineSeparator()}Pick one: "
final run = testruns[System.console().readLine().toInteger()]

final sessions = run.deviceSessions.iterator()
        .findAll({ it.state == APIDeviceSession.State.SUCCEEDED })
sessions.eachWithIndex { session, index ->
    println "${index} - ${session.device.displayName}"
}

print "${System.lineSeparator()}Pick one:"
final session = sessions[System.console().readLine().toInteger()]
final dst = new File('files.zip')
dst.append(session.outputFiles)