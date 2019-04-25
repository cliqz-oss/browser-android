package com.cliqz.browser.main

import android.Manifest
import android.app.Activity
import android.content.Intent
import com.anthonycr.grant.PermissionsManager
import com.anthonycr.grant.PermissionsResultAction
import com.cliqz.browser.R
import org.mozilla.geckoview.GeckoSession.PromptDelegate.FileCallback

object FileChooserHelper {

    private var mCallback: FileCallback? = null

    fun prompt(activity: Activity,
               title: String?,
               type: Int,
               mimeTypes: Array<out String>?,
               callback: FileCallback?) {
        mCallback = callback
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity,
                object : PermissionsResultAction() {
                    override fun onGranted() {
                        promptInternal(activity, title, type, mimeTypes)
                    }

                    override fun onDenied(permission: String?) {
                        mCallback?.dismiss()

                    }

                }, Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.CAMERA)
    }

    @Suppress("UNUSED_PARAMETER")
    private fun promptInternal(activity: Activity,
                               title: String?,
                               type: Int,
                               mimeTypes: Array<out String>?) {
        val cleanTitle = title ?: activity.getString(R.string.upload_file_title)
        val contentIntent = Intent(Intent.ACTION_GET_CONTENT)
        contentIntent.addCategory(Intent.CATEGORY_OPENABLE)
        if (mimeTypes != null && mimeTypes.isNotEmpty()) {
            contentIntent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.joinToString(separator = ";") { v -> v })
        } else {
            contentIntent.type = "*/*"
        }
        val chooserIntent = Intent(Intent.ACTION_CHOOSER)
        chooserIntent.putExtra(Intent.EXTRA_INTENT, contentIntent)
        chooserIntent.putExtra(Intent.EXTRA_TITLE, cleanTitle)
        activity.startActivityForResult(chooserIntent, MainActivity.FILE_UPLOAD_REQUEST_CODE)
    }

    @JvmStatic
    fun notifyResultCancel() {
        mCallback?.dismiss()
        mCallback = null
    }

    @JvmStatic
    fun notifyResultOk(activity: Activity, data: Intent) {
        val result = data.data
        mCallback?.confirm(activity, result)
        mCallback = null
    }
}