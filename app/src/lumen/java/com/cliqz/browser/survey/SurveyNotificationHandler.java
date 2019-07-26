package com.cliqz.browser.survey;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.core.app.NotificationCompat;

import com.cliqz.browser.R;

import java.util.Calendar;
import java.util.Date;
import java.util.List;

/**
 * @author Ravjit Uppal
 */
class SurveyNotificationHandler {

    private static final String SURVEY_NOTIFICATION_CHANNEL_ID = "lumen_survey_notifications";

    /**
     * Schedule a notification to be shown later
     * @param context
     * @param notification The notification to be scheduled
     * @param hourOfDay Time at which the notification should be shown. Example - 13 means 13:00:00
     * @param delay Number of days after which the notification will be shown.
     *              Note - If delay is 0 and the hourOfDay is already past, the notification will be shown immediately.
     * @param requestCode Code to uniquely identify each notification
     */
    static void scheduleNotification(Context context, Notification notification, int hourOfDay, int delay, int requestCode) {
        final Intent notificationIntent = new Intent(context, NotificationPublisher.class);
        notificationIntent.putExtra(NotificationPublisher.NOTIFICATION_ID, requestCode);
        notificationIntent.putExtra(NotificationPublisher.NOTIFICATION, notification);
        final PendingIntent pendingIntent = PendingIntent.getBroadcast(context, (int) System.currentTimeMillis(),
                notificationIntent, 0);
        final Date dat = new Date();//initializes to now
        final Calendar calAlarm = Calendar.getInstance();
        final Calendar calNow = Calendar.getInstance();
        calNow.setTime(dat);
        calAlarm.setTime(dat);
        calAlarm.set(Calendar.HOUR_OF_DAY, hourOfDay);//set the alarm time
        calAlarm.set(Calendar.MINUTE, 0);
        calAlarm.set(Calendar.SECOND, 0);
        calAlarm.add(Calendar.DATE, delay);
        final AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        alarmManager.set(AlarmManager.RTC, calAlarm.getTimeInMillis(), pendingIntent);
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
    static Notification getNotification(Context context, @StringRes int title, @StringRes int content,
                                        @Nullable Intent intent, @Nullable List<NotificationCompat.Action> actions) {
        final NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            final NotificationChannel notificationChannel = new NotificationChannel(SURVEY_NOTIFICATION_CHANNEL_ID,
                    "Survey Notifications", NotificationManager.IMPORTANCE_DEFAULT);
            // Configure the notification channel.
            notificationChannel.setDescription("Survey Notifications");
            notificationChannel.enableVibration(true);
            notificationManager.createNotificationChannel(notificationChannel);
        }
        final NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(context, SURVEY_NOTIFICATION_CHANNEL_ID);
        notificationBuilder.setAutoCancel(true)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(context.getString(title))
                .setContentText(context.getString(content));
        if (intent != null) {
            final PendingIntent contentIntent = PendingIntent.getActivity(context, (int) System.currentTimeMillis(),
                    intent, 0);
            notificationBuilder.setContentIntent(contentIntent);
        }
        if (actions != null && !actions.isEmpty()) {
            for (NotificationCompat.Action action : actions) {
                notificationBuilder.addAction(action);
            }
        }
        return notificationBuilder.build();
    }
}