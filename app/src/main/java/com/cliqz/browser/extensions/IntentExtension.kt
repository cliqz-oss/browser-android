package com.cliqz.browser.extensions

import android.content.Context
import android.content.Intent
import android.provider.Settings

fun Context.launchDefaultAppsSettings() {
    // Some Huawei devices have a different intent to open the screen to change default apps
    val huaweiSpecificIntent = Intent("com.android.settings.PREFERRED_SETTINGS")
    if (packageManager.resolveActivity(huaweiSpecificIntent, 0) != null) {
        startActivity(huaweiSpecificIntent)
    } else {
        val intent = Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS)
        startActivity(intent)
    }
}
