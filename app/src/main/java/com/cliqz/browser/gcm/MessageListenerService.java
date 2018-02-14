/*
  Copyright 2015 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 */
package com.cliqz.browser.gcm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.VisibleForTesting;
import android.support.v4.app.NotificationCompat;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BaseModule;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.app.DaggerBaseComponent;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.peercomm.PeerCommunicationService;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.google.android.gms.gcm.GcmListenerService;

import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.UrlUtils;

public class MessageListenerService extends GcmListenerService {

    static final int CATEGORY_MASK = 10000;

    // 86440 is the number of seconds in a day, if we module the current time (is seconds) by this
    // we will start to overwrite the notifications after more than 24 hours.
    static final int ID_MASK = 100000;

    @SuppressWarnings("WeakerAccess")
    static final class MessageTypes {
        static final int SERVICE = 1;
        static final int NEWS = 2;
        static final int SPORT = 3;

        private MessageTypes() {}
    }

    @SuppressWarnings("WeakerAccess")
    static final class ServiceTypes {
        // Service
        static final int START_PEER = 0;
        static final int DOWNLOAD_FILE = 1;

        // SPORT
        static final int SOCCER = 0;
    }

    static final class MessagesKeys {
        static final String TYPE = "type";
    }

    static final class NewsMessagesKeys {
        static final String TITLE = "title";
        static final String URL = "url";
        static final String COUNTRY = "cn";
        static final String LANGUAGE = "l";
    }

    static final class SoccerMessagesKeys {
        static final String MATCH_ID = "mid";
        static final String LEAGUE_ID = "lid";
        static final String TEAM_IDS = "tids";
        static final String TIMESTAMP = "ts";
        static final String MESSAGE = "message";
        static final String URL = "url";
    }

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    SubscriptionsManager subscriptionsManager;

    private static final String TAG = MessageListenerService.class.getSimpleName();

    private static final int MSG_ERROR_TYPE = -1;

    @Override
    public void onCreate() {
        super.onCreate();
        final AppComponent appComponent = BrowserApp.getAppComponent();
        if (appComponent != null) {
            appComponent.inject(this);
        } else {
            DaggerBaseComponent
                    .builder()
                    .baseModule(new BaseModule(getBaseContext()))
                    .build()
                    .inject(this);
        }
    }

    /**
     * Called when message is received.
     *
     * @param from SenderID of the sender.
     * @param data Data bundle containing message data as key/value pairs.
     *             For Set of keys use data.keySet().
     */
    @Override
    public void onMessageReceived(String from, Bundle data) {
        final int type = Integer.valueOf(data.getString("type", "-1"));
        if (type == MSG_ERROR_TYPE) {
            Log.e(TAG, "Invalid message format " + data.toString());
            return;
        }

        final int mainType = type / CATEGORY_MASK;
        final int subType = type % CATEGORY_MASK;
        switch (mainType) {
            case MessageTypes.SERVICE:
                handleServiceSubType(subType, data);
                break;
            case MessageTypes.NEWS:
                final String title = data.getString(NewsMessagesKeys.TITLE);
                final String url = data.getString(NewsMessagesKeys.URL);
                final String country = data.getString(NewsMessagesKeys.COUNTRY);
                final String lang = data.getString(NewsMessagesKeys.LANGUAGE);
                sendNewsNotification(subType, title, url, country, lang);
                telemetry.sendNotificationSignal(TelemetryKeys.RECEIVE, "news", true);
                break;
            case MessageTypes.SPORT:
                handleSportSubtype(subType, data);
                telemetry.sendNotificationSignal(TelemetryKeys.RECEIVE, "subscription", false);
                break;
            default:
                unknownMessageType(mainType, subType);
                break;
        }
    }

    private void handleSportSubtype(int subType, Bundle data) {
        switch (subType) {
            case ServiceTypes.SOCCER:
                handleSoccer(data);
                break;
            default:
                unknownMessageType(MessageTypes.SPORT, subType);
                break;
        }
    }

    private void handleSoccer(Bundle data) {
        final String soccer = "soccer";
        final String match = "game";
        final String league = "league";
        final String team = "team";
        final String matchId = data.getString(SoccerMessagesKeys.MATCH_ID);
        final String leagueId = data.getString(SoccerMessagesKeys.LEAGUE_ID);
        final String rawTeamIds = data.getString(SoccerMessagesKeys.TEAM_IDS);
        final String[] teamIds = rawTeamIds != null ? rawTeamIds.split(",") : new String[0];
        // final long eventTimestamp = data.getLong(SoccerMessagesKeys.TIMESTAMP);
        boolean isSubscribed = false;

        if (matchId != null) {
            isSubscribed = subscriptionsManager.isSubscribed(soccer, match, matchId);
        }
        if (leagueId != null && !isSubscribed) {
            isSubscribed = subscriptionsManager.isSubscribed(soccer, league, leagueId);
        }
        if (!isSubscribed) {
            for (final String teamId : teamIds) {
                isSubscribed |= subscriptionsManager.isSubscribed(soccer, team, teamId);
            }
        }
        if (!isSubscribed) {
            return;
        }

        //Extract message and link
        final String message = data.getString(SoccerMessagesKeys.MESSAGE);
        final String url = data.getString(SoccerMessagesKeys.URL);

        if (message == null || url == null || message.isEmpty() || url.isEmpty()) {
            return;
        }

        final String title = getString(R.string.app_name);
        final String messageWithFooter = message +
                "\n---\n" +
                getString(R.string.powered_by_kicker);
        createNotification(MessageTypes.SPORT, title, messageWithFooter, url, "subscription");
    }

    private int generateId(int type) {
        final int timestamp = (int) ((System.currentTimeMillis() / 1000L) % ID_MASK);
        return (type * ID_MASK) + timestamp;
    }

    private void createNotification(int msgType, String title, String message, String url, String type) {
        final int id = generateId(msgType);
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(url));
        intent.putExtra(Constants.NOTIFICATION_CLICKED, true);
        intent.putExtra(Constants.NOTIFICATION_TYPE, type);

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0 /* Request code */, intent,
                PendingIntent.FLAG_ONE_SHOT);

        Intent deleteIntent = new Intent(this, NotificationDismissedReceiver.class);
        deleteIntent.putExtra(Constants.NOTIFICATION_TYPE, type);
        PendingIntent deletePendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), 0, deleteIntent, 0);

        // Create notification
        final NotificationCompat.BigTextStyle style = new NotificationCompat.BigTextStyle();
        style.setBigContentTitle(title);
        style.bigText(message);
        final NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this)
                .setSmallIcon(R.drawable.ic_notification_news)
                .setContentTitle(title)
                .setContentText(message)
                .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(deletePendingIntent)
                .setStyle(style);
        // Fix a weird bug on ALCATEL 5080A. Really ALCATEL? Really?
        if (!"shine_lite".equals(Build.DEVICE)) {
            final Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            notificationBuilder.setSound(defaultSoundUri);
        }

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(id, notificationBuilder.build());
        }
    }

    @SuppressWarnings("UnusedParameters")
    @VisibleForTesting
    void handleServiceSubType(int subType, Bundle data) {
        switch (subType) {
            case ServiceTypes.START_PEER:
                PeerCommunicationService.startPeerCommunication(this);
                break;
            case ServiceTypes.DOWNLOAD_FILE:
                break;
            default:
                unknownMessageType(MessageTypes.SERVICE, subType);
                break;
        }
    }

    private void unknownMessageType(int mainType, int subType) {
        Log.e(TAG, String.format("Unknown message with type %d and sub-type %d", mainType, subType));
    }

    /**
     * Create and show a simple notification containing the received GCM message. Does nothing if
     * the notifications are disabled in the preferences.
     *
     * @param newsType the type of the news
     * @param title    news title
     * @param url      news url
     * @param country  country for which the news is relevant
     * @param lang     news language
     */
    @SuppressWarnings("UnusedParameters")
    private void sendNewsNotification(int newsType, String title, String url, String country,
                                      String lang) {
        if (!preferenceManager.getNewsNotificationEnabled()) {
            return;
        }
        // The logic here is:
        // * if both country and lang are null -> this is a worldwide broadcast message, every one
        //   should see it
        // * if only country is null -> this message should be seen by everybody speaking the given
        //   language
        // * if only lang is null -> this message should be seen by everybody in that country
        // * if both country and lang are not null -> the message should be seen by people in the
        //   given country that speak the given language
        if (country != null && !country.equals(preferenceManager.getCountryChoice().countryCode)) {
            return;
        }
        if (lang != null && !lang.equals(Locale.getDefault().getLanguage())) {
            return;
        }
        final String domain = UrlUtils.getTopDomain(url);
        createNotification(MessageTypes.NEWS, domain, title, url, "news");
        telemetry.sendNotificationSignal(TelemetryKeys.ACCEPTED, "news", false);
    }
}
