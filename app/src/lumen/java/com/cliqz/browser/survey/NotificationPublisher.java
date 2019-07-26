package com.cliqz.browser.survey;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import static com.cliqz.browser.survey.SurveysManager.NOTIFICATION;
import static com.cliqz.browser.survey.SurveysManager.NOTIFICATION_ID;
import static com.cliqz.browser.survey.SurveysManager.SHOW_LATER;

/**
 * @author Ravjit Uppal
 */
public class NotificationPublisher extends BroadcastReceiver {

    public void onReceive(Context context, Intent intent) {
        final NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        final int id = intent.getIntExtra(NOTIFICATION_ID, 0);
        final boolean showLater = intent.getBooleanExtra(SHOW_LATER, false);
        if (showLater) {
            //user taped on later, so we reschedule the given notification for the next day
            Notification notification = null;
            if (id == SurveysManager.REQUEST_CODE_SURVEY_1) {
                final SurveysManager surveysManager = new SurveysManager(context);
                notification = surveysManager.buildSurvey1Notification();
            } else if (id == SurveysManager.REQUEST_CODE_SURVEY_2) {
                final SurveysManager surveysManager = new SurveysManager(context);
                notification = surveysManager.buildSurvey2Notification();
            }
            notificationManager.cancel(id);
            SurveyNotificationHandler.scheduleNotification(context, notification, 9, 1, id);
        } else {
            final Notification notification = intent.getParcelableExtra(NOTIFICATION);
            notificationManager.notify(id, notification);
        }
    }
}