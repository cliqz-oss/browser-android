package com.cliqz.browser.app

import android.util.Log
import timber.log.Timber

/**
 * @author Ravjit Uppal
 */
class ReleaseTree : Timber.DebugTree() {

    //We ignore all the logs which are not Log.e for the release build
    override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
        if (priority == Log.ERROR) {
            super.log(priority, tag, message, t)
        }
    }
}
