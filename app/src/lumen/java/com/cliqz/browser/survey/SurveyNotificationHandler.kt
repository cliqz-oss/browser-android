package com.cliqz.browser.survey

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.annotation.StringRes
import androidx.core.app.NotificationCompat
import com.cliqz.browser.R
import com.cliqz.browser.survey.SurveysManager.Companion.NOTIFICATION
import com.cliqz.browser.survey.SurveysManager.Companion.NOTIFICATION_ID
import java.util.*

/**
 * @author Ravjit Uppal
 */
internal object SurveyNotificationHandler {

    private val SURVEY_NOTIFICATION_CHANNEL_ID = "lumen_survey_notifications"

    /**
     * Schedule a notification to be shown later
     * @param context
     * @param notification The notification to be scheduled
     * @param hourOfDay Time at which the notification should be shown. Example - 13 means 13:00:00
     * @param delay Number of days after which the notification will be shown.
     * Note - If delay is 0 and the hourOfDay is already past, the notification will be shown immediately.
     * @param requestCode Code to uniquely identify each notification
     */
    fun scheduleNotification(context: Context, notification: Notification, hourOfDay: Int, delay: Int, requestCode: Int) {
        val notificationIntent = Intent(context, NotificationPublisher::class.java)
        notificationIntent.putExtra(NOTIFICATION_ID, requestCode)
        notificationIntent.putExtra(NOTIFICATION, notification)
        val pendingIntent = PendingIntent.getBroadcast(context, System.currentTimeMillis().toInt(),
                notificationIntent, 0)
        val dat = Date()//initializes to now
        val calAlarm = Calendar.getInstance()
        val calNow = Calendar.getInstance()
        calNow.time = dat
        calAlarm.time = dat
        calAlarm.set(Calendar.HOUR_OF_DAY, hourOfDay)//set the alarm time
        calAlarm.set(Calendar.MINUTE, 0)
        calAlarm.set(Calendar.SECOND, 0)
        calAlarm.add(Calendar.DATE, delay)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.set(AlarmManager.RTC, calAlarm.timeInMillis, pendingIntent)
    }

    /**
     * Builds a notification with the given parameters
     * @param context
     * @param title Title of the notification
     * @param content Content of the notification
     * @param intent Intent to launch when the notification is tapped
     * @param actions List of actions to be shown in the notification
     * @return notification
     */
    fun getNotification(context: Context, @StringRes title: Int, @StringRes content: Int,
                        intent: Intent?, actions: List<NotificationCompat.Action>?): Notification {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationChannel = NotificationChannel(SURVEY_NOTIFICATION_CHANNEL_ID,
                    "Survey Notifications", NotificationManager.IMPORTANCE_DEFAULT)
            // Configure the notification channel.
            notificationChannel.description = "Survey Notifications"
            notificationChannel.enableVibration(true)
            notificationManager.createNotificationChannel(notificationChannel)
        }
        val notificationBuilder = NotificationCompat.Builder(context, SURVEY_NOTIFICATION_CHANNEL_ID)
        notificationBuilder.setAutoCancel(true)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(context.getString(title))
                .setContentText(context.getString(content))
        if (intent != null) {
            val contentIntent = PendingIntent.getActivity(context, System.currentTimeMillis().toInt(),
                    intent, 0)
            notificationBuilder.setContentIntent(contentIntent)
        }
        if (actions != null && !actions.isEmpty()) {
            for (action in actions) {
                notificationBuilder.addAction(action)
            }
        }
        return notificationBuilder.build()
    }
}