package com.cliqz.gradle

import com.android.build.OutputFile
import com.android.build.gradle.AppExtension
import com.android.build.gradle.api.ApkVariantOutput
import org.gradle.api.DefaultTask
import org.gradle.api.Plugin
import org.gradle.api.Project

@Suppress("unused")
class CliqzPlugin: Plugin<Project> {
    override fun apply(project: Project) {
        val android = project.property("android") as AppExtension
        android.productFlavors.names.forEach {
            android.defaultConfig.apply {
                val upperName = it.toUpperCase()
                buildConfigField("String", "FLAVOR_$upperName", "\"$it\"")
                buildConfigField("boolean", "IS_$upperName", "FLAVOR.equals(FLAVOR_$upperName)")
                buildConfigField("boolean", "IS_NOT_$upperName", "!IS_$upperName")
            }
        }

        val preBuild = project.property("preBuild") as DefaultTask
        val defaultVersionCode = android.defaultConfig.versionCode
        preBuild.doLast {
            android.applicationVariants.forEach { variant ->
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
        }
    }

    companion object {
        private val ABI_CODES = mapOf(
                "armeabi-v7a" to 2, "arm64-v8a" to 4, "x86" to 6, "x86_64" to 8)
    }
}