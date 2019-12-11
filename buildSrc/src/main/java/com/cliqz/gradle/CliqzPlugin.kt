package com.cliqz.gradle

import com.android.build.OutputFile
import com.android.build.gradle.AppExtension
import com.android.build.gradle.api.ApkVariantOutput
import com.android.build.gradle.api.ApplicationVariant
import org.gradle.api.GradleException
import org.gradle.api.Plugin
import org.gradle.api.Project
import java.io.File
import java.io.FileNotFoundException

@Suppress("unused")
class CliqzPlugin: Plugin<Project> {

    var versionName: String = "0.0.0"

    override fun apply(project: Project) {
        // Read the version name from <projectRoot>/version.txt
        val versionFile = File(project.rootProject.rootDir, versionFileName)
        try {
            if (!versionFile.isFile) throw FileNotFoundException("$versionFile does not exists or is not a file")
            versionName = versionFile.readLines().first()
        } catch (e: Throwable) {
            throw GradleException("Error reading the version name from ${versionFile.path}", e)
        }

        // TODO: Can this be moved to afterEvaluate too?
        val android = project.property("android") as AppExtension
        android.productFlavors.names.forEach {
            android.defaultConfig.apply {
                val upperName = it.toUpperCase()
                buildConfigField("String", "FLAVOR_$upperName", "\"$it\"")
                buildConfigField("boolean", "IS_$upperName", "FLAVOR.equals(FLAVOR_$upperName)")
               buildConfigField("boolean", "IS_NOT_$upperName", "!IS_$upperName")
            }
        }

        project.afterEvaluate {
            android.applicationVariants.forEach { variant ->
                setVersionCode(project, variant)
                createCliqzConfigTasks(project, variant)
                if (variant.buildType.isDebuggable) {
                    createTestdroidTask(project, variant)
                }
            }
        }
    }

    private fun createTestdroidTask(project: Project, variant: ApplicationVariant) {
        val taskName = "connect${variant.name.capitalize()}TestDroid"
        // Make sure this task depends on the assembling of the app and tests, we need those file to be uploaded
        val assembleTestProvider = project.tasks.named("assemble${variant.name.capitalize()}AndroidTest")
        val assembleProvider = project.tasks.named("assemble${variant.name.capitalize()}")
        val taskProvider = project.tasks.register(taskName, TestDroidTask::class.java)
        taskProvider.configure {
            it.dependsOn(assembleProvider, assembleTestProvider)
        }
    }

    private fun createCliqzConfigTasks(project: Project, variant: ApplicationVariant) {
        val buildConfigProvider = variant.generateBuildConfigProvider
        val javaCompileProvider = variant.javaCompileProvider
        // val sourceOutdir = buildConfig.sourceOutputDir
        val taskName = "generate${variant.name.capitalize()}CliqzConfig"
        // val packageName = buildConfig.buildConfigPackageName
        val builtType = variant.buildType.name
        // This generate possible config names to look for in the json
        val flavorNames = variant.productFlavors.fold(emptySet<String>()) { acc, productFlavor ->
            acc + (listOf(productFlavor.name, "${productFlavor.name}${builtType.capitalize()}", builtType))
        }

        val taskProvider = project.tasks.register(taskName, CliqzConfigTask::class.java, buildConfigProvider, flavorNames)
        taskProvider.configure {
            it.dependsOn(buildConfigProvider)
        }
        project.tasks.named("compile${variant.name.capitalize()}Kotlin").configure {
            it.dependsOn(taskProvider)
        }
        javaCompileProvider.configure {
            it.dependsOn(taskProvider)
        }
    }

    private fun setVersionCode(project: Project, variant: ApplicationVariant) {
        val now = System.currentTimeMillis()
        val hoursSinceJan2019 = (now - janFirst2019) / millisInHour
        variant.outputs.forEach { output ->
            val abi = output.filters.find { it.filterType == OutputFile.ABI }
            abi?.let {
                val abiVersion = ABI_CODES[it.identifier]
                val versionCode = hoursSinceJan2019.toInt() * 10 + abiVersion!!
                project.logger.warn("${variant.name} ${it.identifier} version code: $versionCode")
                (output as ApkVariantOutput).apply {
                    versionCodeOverride = versionCode
                    versionNameOverride = versionName
                }
            }
        }
    }



    companion object {
        private const val versionFileName = "version.txt"
        private val ABI_CODES = mapOf(
                "armeabi-v7a" to 2, "arm64-v8a" to 4, "x86" to 6, "x86_64" to 8)
        private const val janFirst2019 = 1546297200000L
        private const val millisInHour = 3600000L
    }
}
