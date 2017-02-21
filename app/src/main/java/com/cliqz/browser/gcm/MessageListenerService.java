/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.cliqz.browser.gcm;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Bundle;
import android.support.v4.app.NotificationCompat;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Countries;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.TelemetryKeys;
import com.google.android.gms.gcm.GcmListenerService;

import java.util.Locale;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.UrlUtils;

public class MessageListenerService extends GcmListenerService {

    private static final int CATEGORY_MASK = 10000;
    private static final int SERVICE_MESSAGE_TYPE = 1;
    private static final int NEWS_MESSAGE_TYPE = 2;

    final PreferenceManager preferenceManager;
    final Telemetry telemetry;

    private static final String TAG = MessageListenerService.class.getSimpleName();

    private static final int MSG_ERROR_TYPE = -1;

    public MessageListenerService() {
        super();
        preferenceManager = BrowserApp.getAppComponent().getPreferenceManager();
        telemetry = BrowserApp.getAppComponent().getTelemetry();
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
        final String title = data.getString("title");
        final String url = data.getString("url");
        final String country = data.getString("cn");

        Log.i(TAG, String.format(Locale.US,
                "Received message with type %d title \"%s\" and url \"%s\"",
                type, title, url));

        final int mainType = type / CATEGORY_MASK;
        final int subType = type % CATEGORY_MASK;
        switch (mainType) {
            case SERVICE_MESSAGE_TYPE:
                Log.w(TAG, "Not yet supported");
                break;
            case NEWS_MESSAGE_TYPE:
                sendNewsNotification(subType, title, url, country);
                telemetry.sendNewsNotificationSignal(TelemetryKeys.RECEIVE, true);
                break;
            default:
                Log.e(TAG, String.format("Unknown message with type %d and sub-type %d", mainType, subType));
                break;
        }
    }

    /**
     * Create and show a simple notification containing the received GCM message. Does nothing if
     * the notifications are disabled in the preferences.
     *
     * @param title GCM message received.
     * @param url   url
     */
    private void sendNewsNotification(int newType, String title, String url, String country) {
        if (!preferenceManager.getNewsNotificationEnabled() || country == null ||
                !country.equals(preferenceManager.getCountryChoice().countryCode)) {
            return;
        }

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse(url));
        intent.putExtra(Constants.NOTIFICATION_CLICKED, true);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0 /* Request code */, intent,
                PendingIntent.FLAG_ONE_SHOT);

        Intent deleteIntent = new Intent(this, NotificationDismissedReceiver.class);
        PendingIntent deletePendingIntent = PendingIntent.getBroadcast(this.getApplicationContext(), 0, deleteIntent, 0);

        final Uri uri = Uri.parse(url);
        final String host = uri.getHost();
        final String domain = UrlUtils.getTopDomain(url);
        final Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        final NotificationCompat.BigTextStyle style = new NotificationCompat.BigTextStyle();
        style.bigText(title);
        final NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this)
                .setSmallIcon(R.drawable.ic_notification_news)
                .setContentTitle(domain)
                .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
                .setContentText(title)
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(deletePendingIntent)
                .setStyle(style);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        notificationManager.notify(0 /* ID of notification */, notificationBuilder.build());
    }
}
