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

import android.app.IntentService;
import android.content.Intent;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.google.android.gms.gcm.GoogleCloudMessaging;
import com.google.android.gms.iid.InstanceID;

import java.io.IOException;
import java.lang.reflect.Field;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;

public class RegistrationIntentService extends IntentService {

    private static final String TAG = RegistrationIntentService.class.getSimpleName();
    private static final String[] TOPICS = {"global"};

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    AwsSNSManager awsSNSManager;

    private final Integer gcm_defaultSenderId;

    public RegistrationIntentService() {
        super(TAG);
        BrowserApp.getAppComponent().inject(this);

        // We use reflection to get the sender id (fdroid flavour has no sender id)
        Integer senderId = null;
        try {
            Field f = R.string.class.getField("gcm_defaultSenderId");
            senderId = f.getInt(R.string.class);
        } catch (NoSuchFieldException e) {
            Log.i(TAG, "Can't find gcm default sender id");
        } catch (IllegalAccessException e) {
            Log.i(TAG, "Illegal access to gcm default sender id");
        }
        gcm_defaultSenderId = senderId;
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        if (gcm_defaultSenderId == null) {
            // We do not have a sender id, do nothing
            Log.i(TAG, "GCM Disabled");
            return;
        }
        try {
            // [START register_for_gcm]
            // Initially this call goes out to the network to retrieve the token, subsequent calls
            // are local.
            // R.string.gcm_defaultSenderId (the Sender ID) is typically derived from google-services.json.
            // See https://developers.google.com/cloud-messaging/android/start for details on this file.
            // [START get_token]
            final InstanceID instanceID = InstanceID.getInstance(this);
            final String id = getString(gcm_defaultSenderId);
            final String token = instanceID.getToken(id, GoogleCloudMessaging.INSTANCE_ID_SCOPE, null);
            // [END get_token]
            Log.i(TAG, "GCM Registration Token: " + token);

            // TODO: Implement this method to send any registration to your app's servers.
            sendRegistrationToServer(token);

            // Subscribe to topic channels
            subscribeTopics(token);

            // You should store a boolean that indicates whether the generated token has been
            // sent to your server. If the boolean is false, send the token to your server,
            // otherwise your server should have already received the token.
            preferenceManager.setGCMTokenSent(true);
            // [END register_for_gcm]
        } catch (Exception e) {
            Log.d(TAG, "Failed to complete token refresh", e);
            // If an exception happens while fetching the new token or updating our registration data
            // on a third-party server, this ensures that we'll attempt the update at a later time.
            preferenceManager.setGCMTokenSent(false);
        }
        // Notify UI that registration has completed, so the progress indicator can be hidden.
        Intent registrationComplete = new Intent(Constants.GCM_REGISTRATION_COMPLETE);
        LocalBroadcastManager.getInstance(this).sendBroadcast(registrationComplete);
    }

    /**
     * Persist registration to third-party servers.
     *
     * Modify this method to associate the user's GCM registration token with any server-side account
     * maintained by your application.
     *
     * @param token The new token.
     */
    private void sendRegistrationToServer(String token) {
        awsSNSManager.registerWithSNS(token);
    }

    /**
     * Subscribe to any GCM topics of interest, as defined by the TOPICS constant.
     *
     * @param token GCM token
     * @throws IOException if unable to reach the GCM PubSub service
     */
    // [START subscribe_topics]
    private void subscribeTopics(String token) throws IOException {
//        GcmPubSub pubSub = GcmPubSub.getInstance(this);
//        for (String topic : TOPICS) {
//            pubSub.subscribe(token, "/topics/" + topic, null);
//        }
        for (String topicArn: BuildConfig.TOPIC_ARNS) {
            awsSNSManager.subscribeSNSTopic(topicArn);
        }
    }
    // [END subscribe_topics]

}
