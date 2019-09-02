package com.cliqz.browser.extensions

import android.content.Context

fun Context.deleteCacheDir() {
    cacheDir.deleteRecursively()
}
