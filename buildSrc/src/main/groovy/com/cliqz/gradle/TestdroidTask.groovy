package com.cliqz.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.tasks.TaskAction

class TestdroidTask extends DefaultTask {

    @TaskAction
    def connectTestdroid() {
        println("Hello, world!!!")
        // 1. Does the project identified by the id param exists? Decide yourself how to pass this param
        // 2. Upload the 2 apks and store the ids
        // 3. Create the testrun and run it
        // 4. Poll every minute (os so) to check the job finished
        // 5. Download the artifacts and put them in a predefined folder (where Azure/Jenkins can find it)
        // 6. log error if any test failed, otherwise just return
    }
}
