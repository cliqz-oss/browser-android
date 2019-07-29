package com.cliqz.browser.survey

import android.content.Context

/**
 * @author Ravjit Uppal
 *
 * Dummy class for cliqz flavour
 */
class SurveysManager(context: Context) {

    private val mContext: Context? = null

    fun setUpLumenSurvey1() {}

    fun setUpLumenSurvey2(trialDaysLeft: Int) {}

    companion object {

        @JvmField
        var NOTIFICATION_ID = "notification-id"
        var NOTIFICATION = "notification"
        var SHOW_LATER = "show-later"
    }
}
