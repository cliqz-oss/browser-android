package com.cliqz.browser.survey

import acr.browser.lightning.preference.PreferenceManager
import android.app.Notification
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.survey.SurveyNotificationHandler.getNotification
import com.cliqz.browser.survey.SurveyNotificationHandler.scheduleNotification
import java.util.*
import javax.inject.Inject


/**
 * @author Ravjit Uppal
 */
class SurveysManager(private val mContext: Context) {

    @Inject
    lateinit var mPreferenceManager: PreferenceManager

    init {
        BrowserApp.getAppComponent().inject(this)
    }

    fun setUpLumenSurvey1() {
        //notification already scheduled
        if (mPreferenceManager!!.isLumenSurvey1Scheduled) {
            return
        }
        //don't show notifcation if user's device is not english or german
        val language = Locale.getDefault().language
        if (!(language == "en" || language == "de")) {
            return
        }
        scheduleNotification(mContext, buildSurvey1Notification(), 9, 1, REQUEST_CODE_SURVEY_1)
        mPreferenceManager!!.isLumenSurvey1Scheduled = true
    }

    internal fun buildSurvey1Notification(): Notification {
        //intent to open the survey link when user taps on the notification
        val takeSurveyIntent = Intent(mContext, MainActivity::class.java)
        takeSurveyIntent.action = Intent.ACTION_VIEW
        takeSurveyIntent.putExtra(NOTIFICATION_ID, REQUEST_CODE_SURVEY_1)
        takeSurveyIntent.data = Uri.parse("https://www.surveymonkey.de/r/1Lumen")

        val actions = getSurveyNotificiationActions(REQUEST_CODE_SURVEY_1, takeSurveyIntent)
        return getNotification(mContext, R.string.survey_1_title, R.string.survey_1_message,
                takeSurveyIntent, actions)
    }

    fun setUpLumenSurvey2(trialDaysLeft: Int) {
        //notification already scheduled
        if (mPreferenceManager!!.isLumenSurvey2Scheduled) {
            return
        }
        //don't show notifcation if user's device is not english or german
        val language = Locale.getDefault().language
        if (!(language == "en" || language == "de")) {
            return
        }

        scheduleNotification(mContext, buildSurvey2Notification(), 9, trialDaysLeft - 1, REQUEST_CODE_SURVEY_2)
        mPreferenceManager!!.isLumenSurvey2Scheduled = true
    }

    internal fun buildSurvey2Notification(): Notification {
        //intent to open the survey link when user taps on the notification
        val takeSurveyIntent = Intent(mContext, MainActivity::class.java)
        takeSurveyIntent.action = Intent.ACTION_VIEW
        takeSurveyIntent.putExtra(NOTIFICATION_ID, REQUEST_CODE_SURVEY_2)
        takeSurveyIntent.data = Uri.parse("https://www.surveymonkey.de/r/2Lumen")

        val actions = getSurveyNotificiationActions(
                REQUEST_CODE_SURVEY_2, takeSurveyIntent)
        return getNotification(mContext, R.string.survey_2_title, R.string.survey_2_message,
                takeSurveyIntent, actions)
    }

    private fun getSurveyNotificiationActions(requestCode: Int, takeSurveyIntent: Intent): List<NotificationCompat.Action> {
        //Action take survey. Same as the intent when users taps on the notification
        val takeSurveyPendingIntent = PendingIntent.getActivity(mContext,
                System.currentTimeMillis().toInt(), takeSurveyIntent, 0)
        val actionTakeSurvey = NotificationCompat.Action(0,
                mContext.getString(R.string.take_survey), takeSurveyPendingIntent)

        //Action to show the notification again later
        val takeSurveyLaterIntent = Intent(mContext, NotificationPublisher::class.java)
        takeSurveyLaterIntent.putExtra(NOTIFICATION_ID, requestCode)
        takeSurveyLaterIntent.putExtra(SHOW_LATER, true)

        val takeSurveyLaterPendingIntent = PendingIntent.getBroadcast(mContext,
                System.currentTimeMillis().toInt(), takeSurveyLaterIntent, 0)
        val actionTakeSurveyLater = NotificationCompat.Action(0,
                mContext.getString(R.string.take_survey_later), takeSurveyLaterPendingIntent)

        val actions = ArrayList<NotificationCompat.Action>()
        actions.add(actionTakeSurvey)
        actions.add(actionTakeSurveyLater)
        return actions
    }

    fun resetAllScheduledSurveys() {
        mPreferenceManager!!.isLumenSurvey1Scheduled = false
        mPreferenceManager!!.isLumenSurvey2Scheduled = false
    }

    companion object {
        val REQUEST_CODE_SURVEY_1 = 1
        val REQUEST_CODE_SURVEY_2 = 2
        @JvmField
        val NOTIFICATION_ID = "notification-id"
        val NOTIFICATION = "notification"
        val SHOW_LATER = "show-later"
    }
}
