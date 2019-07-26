package com.cliqz.browser.survey

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * @author Ravjit Uppal
 *
 * All task scheduled using AlarmManager are canceled when device is rebooted.
 * We use this class to notify SurveysManager about the same.
 */
class BootCompletedListener : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {

        if ("android.intent.action.BOOT_COMPLETED" == intent.action) {
            val surveysManager = SurveysManager(context)
            surveysManager.resetAllScheduledSurveys()
        }
    }
}
