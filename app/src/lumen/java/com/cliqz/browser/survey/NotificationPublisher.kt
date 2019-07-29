package com.cliqz.browser.survey

import android.app.Notification
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.cliqz.browser.survey.SurveysManager.Companion.NOTIFICATION
import com.cliqz.browser.survey.SurveysManager.Companion.NOTIFICATION_ID
import com.cliqz.browser.survey.SurveysManager.Companion.SHOW_LATER

/**
 * @author Ravjit Uppal
 */
class NotificationPublisher : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val id = intent.getIntExtra(NOTIFICATION_ID, 0)
        val showLater = intent.getBooleanExtra(SHOW_LATER, false)
        if (showLater) {
            //user taped on later, so we reschedule the given notification for the next day
            var notification: Notification? = null
            if (id == SurveysManager.REQUEST_CODE_SURVEY_1) {
                val surveysManager = SurveysManager(context)
                notification = surveysManager.buildSurvey1Notification()
            } else if (id == SurveysManager.REQUEST_CODE_SURVEY_2) {
                val surveysManager = SurveysManager(context)
                notification = surveysManager.buildSurvey2Notification()
            }
            notificationManager.cancel(id)
            notification?.let {
                SurveyNotificationHandler.scheduleNotification(context, notification, 9, 1, id)
            }
        } else {
            val notification = intent.getParcelableExtra<Notification>(NOTIFICATION)
            notificationManager.notify(id, notification)
        }
    }
}