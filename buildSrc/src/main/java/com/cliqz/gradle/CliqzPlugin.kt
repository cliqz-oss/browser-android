package com.cliqz.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project

class CliqzPlugin: Plugin<Project> {
    override fun apply(project: Project) {
        System.out.println(project::class.toString())
    }
}