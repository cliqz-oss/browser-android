package com.cliqz.gradle

import com.android.build.gradle.tasks.GenerateBuildConfig
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.squareup.javawriter.JavaWriter
import org.gradle.api.DefaultTask
import org.gradle.api.logging.Logger
import org.gradle.api.tasks.TaskAction
import org.gradle.api.tasks.TaskProvider
import java.io.File
import java.io.FileReader
import java.io.FileWriter
import java.util.*
import javax.inject.Inject
import javax.lang.model.element.Modifier
import kotlin.reflect.KMutableProperty1
import kotlin.reflect.full.declaredMemberProperties

open class CliqzConfigTask @Inject constructor(
        val buildConfigProvider: TaskProvider<GenerateBuildConfig>,
        val flavorNames: Set<String>) : DefaultTask() {

    @TaskAction
    fun generateCliqzConfig() {
        // Read the json file
        val configFile = project.file(CLIQZ_CONFIG_JSON)
        val type = MapTypeToken().type
        val config = FileReader(configFile).use {
            val configs = Gson().fromJson<Map<String, Config>>(it, type)
            val defaultConfig = configs[DEFAULT_CONFIG_KEY] ?: Config()
            val mergedConfig = configs.filter { (key, _) ->
                flavorNames.contains(key)
            }.values.fold(Config()) { result, other ->
                result.merge(other, logger)
            }
            defaultConfig.merge(mergedConfig)
            return@use defaultConfig
        }
        val builConfigTask = buildConfigProvider.get()
        val generatedSourceDir = builConfigTask.sourceOutputDir
        val packageName = builConfigTask.buildConfigPackageName
        val outDir = File(generatedSourceDir, packageName.replace('.', File.separatorChar))
        val outFile = File(outDir, "CliqzConfig.java")
        FileWriter(outFile).use { writer ->
            val javaWriter = JavaWriter(writer)
            javaWriter.emitJavadoc("Auto generated, do not edit")
                    .emitPackage(packageName)
                    .beginType("CliqzConfig", "class", EnumSet.of(Modifier.PUBLIC, Modifier.FINAL))
            Config::class.declaredMemberProperties.forEach { property ->
                val allCapsKey = property.name.replace(Regex("([A-Z]+)"), "_\$1").toUpperCase()
                val value = property.get(config)
                when (value) {
                    is String -> javaWriter.emitField(
                            "String",
                            allCapsKey,
                            EnumSet.of(Modifier.PUBLIC, Modifier.FINAL, Modifier.STATIC),
                            "\"${property.get(config)}\"")
                    is List<*> -> javaWriter.emitField(
                            "String[]",
                            allCapsKey,
                            EnumSet.of(Modifier.PUBLIC, Modifier.FINAL, Modifier.STATIC),
                            value.joinToString(prefix = "new String[] {", postfix = "}", transform = { "\"$it\""})
                    )
                }
            }
            javaWriter.endType()
        }
    }


    companion object {
        private const val CLIQZ_CONFIG_JSON = "cliqz-config.json"
        private const val DEFAULT_CONFIG_KEY = ".default"
    }
}
private class MapTypeToken: TypeToken<Map<String, Config>>()

class Config {
    var amazonAccountID = ""
    var amazonAuthRoleARN = ""
    var amazonUnauthRoleARN = ""
    var amazonIdentityPoolID = ""
    var amazonApplicationARN = ""
    var amazonSnsTopics = mutableListOf<String>()

    fun merge(other: Config, logger: Logger? = null): Config {
        amazonAccountID = mergeProperty(logger, other, Config::amazonAccountID)
        amazonAuthRoleARN = mergeProperty(logger, other, Config::amazonAuthRoleARN)
        amazonUnauthRoleARN = mergeProperty(logger, other, Config::amazonUnauthRoleARN)
        amazonIdentityPoolID = mergeProperty(logger, other, Config::amazonIdentityPoolID)
        amazonApplicationARN = mergeProperty(logger, other, Config::amazonApplicationARN)
        val topics = amazonSnsTopics.toMutableSet()
        topics.addAll(other.amazonSnsTopics)
        amazonSnsTopics = topics.toMutableList()
        return this
    }

    private fun mergeProperty(logger: Logger?, other: Config, property: KMutableProperty1<Config, String>): String {
        val v1 = property.get(this)
        val v2 = property.get(other)
        if (v1.isNotEmpty() && v2.isNotEmpty()) {
            logger?.warn("Duplicated property ${property.name}")
        }
        return if (v2.isNotEmpty()) v2 else v1
    }

}

