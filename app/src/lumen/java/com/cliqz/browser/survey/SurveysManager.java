package com.cliqz.browser.survey;

import android.app.Notification;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

import androidx.core.app.NotificationCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivity;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

import static com.cliqz.browser.survey.SurveyNotificationHandler.getNotification;
import static com.cliqz.browser.survey.SurveyNotificationHandler.scheduleNotification;

/**
 * @author Ravjit Uppal
 */
public class SurveysManager {

    public static final int REQUEST_CODE_SURVEY_1 = 1;
    public static final int REQUEST_CODE_SURVEY_2 = 2;
    public static String NOTIFICATION_ID = "notification-id";
    public static String NOTIFICATION = "notification";
    public static String SHOW_LATER = "show-later";

    private Context mContext;

    @Inject
    PreferenceManager mPreferenceManager;

    public SurveysManager(Context context) {
        this.mContext = context;
        BrowserApp.getAppComponent().inject(this);
    }

    public void setUpLumenSurvey1() {
        //notification already scheduled
        if (mPreferenceManager.isLumenSurvey1Scheduled()) {
            return;
        }
        //don't show notifcation if user's device is not english or german
        final String language = Locale.getDefault().getLanguage();
        if (!(language.equals("en") || language.equals("de"))) {
            return;
        }
        scheduleNotification(mContext, buildSurvey1Notification(), 9, 1, REQUEST_CODE_SURVEY_1);
        mPreferenceManager.setLumenSurvey1Scheduled(true);
    }

    Notification buildSurvey1Notification() {
        //intent to open the survey link when user taps on the notification
        final Intent takeSurveyIntent = new Intent(mContext, MainActivity.class);
        takeSurveyIntent.setAction(Intent.ACTION_VIEW);
        takeSurveyIntent.putExtra(NOTIFICATION_ID, REQUEST_CODE_SURVEY_1);
        takeSurveyIntent.setData(Uri.parse("https://www.surveymonkey.de/r/1Lumen"));

        final List<NotificationCompat.Action> actions = getSurveyNotificiationActions(
                REQUEST_CODE_SURVEY_1, takeSurveyIntent);
        return getNotification(mContext, R.string.survey_1_title, R.string.survey_1_message,
                takeSurveyIntent, actions);
    }

    public void setUpLumenSurvey2(int trialDaysLeft) {
        //notification already scheduled
        if (mPreferenceManager.isLumenSurvey2Scheduled()) {
            return;
        }
        //don't show notifcation if user's device is not english or german
        final String language = Locale.getDefault().getLanguage();
        if (!(language.equals("en") || language.equals("de"))) {
            return;
        }

        scheduleNotification(mContext, buildSurvey2Notification(), 9, trialDaysLeft - 1, REQUEST_CODE_SURVEY_2);
        mPreferenceManager.setLumenSurvey2Scheduled(true);
    }

    Notification buildSurvey2Notification() {
        //intent to open the survey link when user taps on the notification
        final Intent takeSurveyIntent = new Intent(mContext, MainActivity.class);
        takeSurveyIntent.setAction(Intent.ACTION_VIEW);
        takeSurveyIntent.putExtra(NOTIFICATION_ID, REQUEST_CODE_SURVEY_2);
        takeSurveyIntent.setData(Uri.parse("https://www.surveymonkey.de/r/2Lumen"));

        final List<NotificationCompat.Action> actions = getSurveyNotificiationActions(
                REQUEST_CODE_SURVEY_2, takeSurveyIntent);
        return getNotification(mContext, R.string.survey_2_title, R.string.survey_2_message,
                takeSurveyIntent, actions);
    }

    private List<NotificationCompat.Action> getSurveyNotificiationActions(int requestCode, Intent takeSurveyIntent) {
        //Action take survey. Same as the intent when users taps on the notification
        final PendingIntent takeSurveyPendingIntent = PendingIntent.getActivity(mContext,
                (int) System.currentTimeMillis(), takeSurveyIntent, 0);
        final NotificationCompat.Action actionTakeSurvey = new NotificationCompat.Action(0,
                mContext.getString(R.string.take_survey), takeSurveyPendingIntent);

        //Action to show the notification again later
        final Intent takeSurveyLaterIntent = new Intent(mContext, NotificationPublisher.class);
        takeSurveyLaterIntent.putExtra(NOTIFICATION_ID, requestCode);
        takeSurveyLaterIntent.putExtra(SHOW_LATER, true);

        final PendingIntent takeSurveyLaterPendingIntent = PendingIntent.getBroadcast(mContext,
                (int) System.currentTimeMillis(), takeSurveyLaterIntent, 0);
        final NotificationCompat.Action actionTakeSurveyLater = new NotificationCompat.Action(0,
                mContext.getString(R.string.take_survey_later), takeSurveyLaterPendingIntent);

        final ArrayList<NotificationCompat.Action> actions = new ArrayList<>();
        actions.add(actionTakeSurvey);
        actions.add(actionTakeSurveyLater);
        return actions;
    }

    public void resetAllScheduledSurveys() {
        mPreferenceManager.setLumenSurvey1Scheduled(false);
        mPreferenceManager.setLumenSurvey2Scheduled(false);
    }
}
