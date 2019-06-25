package com.cliqz.gradle

import com.android.build.OutputFile
import com.android.build.gradle.AppExtension
import com.android.build.gradle.api.ApkVariantOutput
import com.android.build.gradle.api.ApplicationVariant
import org.gradle.api.Plugin
import org.gradle.api.Project

@Suppress("unused")
class CliqzPlugin: Plugin<Project> {
    override fun apply(project: Project) {
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

        val defaultVersionCode = android.defaultConfig.versionCode
        project.afterEvaluate {
            android.applicationVariants.forEach { variant ->
                setVersionCode(defaultVersionCode, variant)
                createCliqzConfigTasks(project, variant)
            }
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

    private fun setVersionCode(defaultVersionCode: Int, variant: ApplicationVariant) {
        val apiVersion = variant.productFlavors[0].versionCode
        variant.outputs.forEach { output ->
            val abi = output.filters.find { it.filterType == OutputFile.ABI }
            abi?.let {
                val abiVersion = ABI_CODES[it.identifier]
                (output as ApkVariantOutput).versionCodeOverride =
                        defaultVersionCode * 100 + apiVersion * 10 + abiVersion!!
            }
        }
    }



    companion object {
        private val ABI_CODES = mapOf(
                "armeabi-v7a" to 2, "arm64-v8a" to 4, "x86" to 6, "x86_64" to 8)
    }
}
