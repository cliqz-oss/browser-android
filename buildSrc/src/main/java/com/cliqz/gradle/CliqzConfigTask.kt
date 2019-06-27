package com.cliqz.gradle

import com.android.build.gradle.tasks.GenerateBuildConfig
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.squareup.javawriter.JavaWriter
import org.gradle.api.DefaultTask
import org.gradle.api.logging.Logger
import org.gradle.api.tasks.*
import org.gradle.api.tasks.Optional
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

    val inputFile: File? by lazy {
        val inFile = project.file(CLIQZ_CONFIG_JSON)
        if (inFile.isFile) inFile else null
    }
        @Optional @InputFile get

    private val buildConfigTask: GenerateBuildConfig by lazy { buildConfigProvider.get() }
    private val packageName: String by lazy { buildConfigTask.buildConfigPackageName }

    val outputDirectory: File by lazy {
        File(buildConfigTask.sourceOutputDir, packageName.replace('.', File.separatorChar))
    }
        @OutputDirectory get

    val outputFile: File by lazy {
        File(outputDirectory, "CliqzConfig.java")
    }
        @OutputFile get

    @TaskAction
    fun generateCliqzConfig() {
        // Read the json file
        val type = MapTypeToken().type
        val config = if (inputFile == null) {
            logger.warn("Missing $CLIQZ_CONFIG_JSON")
            Config()
        } else FileReader(inputFile).use {
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

        FileWriter(outputFile).use { writer ->
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

// All the properties are only used via reflection, so they are "unused"
@Suppress("unused")
class Config {
    var amazonAccountID = ""
    var amazonAuthRoleARN = ""
    var amazonUnauthRoleARN = ""
    var amazonIdentityPoolID = ""
    var amazonApplicationARN = ""
    var amazonSnsTopics = mutableListOf<String>()
    var vpnApiKey = ""
    var revenuecatApiKey = ""
    var sentryToken = ""

    @Suppress("UNCHECKED_CAST")
    fun merge(other: Config, logger: Logger? = null): Config {
        Config::class.declaredMemberProperties.forEach { member ->
            when (member.returnType.classifier) {
                String::class -> mergeStringProperty(logger, other, member as KMutableProperty1<Config, String>)
                MutableList::class -> mergeListProperty(other, member as KMutableProperty1<Config, List<String>>)
                else -> logger?.error("Can't merge property ${member.name}")
            }
        }
        return this
    }

    private fun mergeListProperty(other: Config, property: KMutableProperty1<Config, List<String>>) {
        val topics = property.get(this).toMutableSet()
        topics.addAll(property.get(other))
        property.set(this, topics.toMutableList())
    }

    private fun mergeStringProperty(logger: Logger?, other: Config, property: KMutableProperty1<Config, String>) {
        val v1 = property.get(this)
        val v2 = property.get(other)
        if (v1.isNotEmpty() && v2.isNotEmpty()) {
            logger?.warn("Duplicated property ${property.name}")
        }
        if (v2.isNotEmpty()) {
            property.set(this, v2)
        }
    }

}

