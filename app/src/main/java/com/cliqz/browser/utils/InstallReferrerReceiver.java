package com.cliqz.browser.utils;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.cliqz.browser.app.BrowserApp;

import java.io.UnsupportedEncodingException;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * Created by Ravjit on 30/05/16.
 * This class receives the install referrer when the app is installed.
 * It then extracts utm_source and utm_content from the referrer string and concatenates both values
 * with an underscore, which is then used in telemetry signals.
 */
public class InstallReferrerReceiver extends BroadcastReceiver {

    private static final String TAG = InstallReferrerReceiver.class.getSimpleName();
    private static final String KEY_CAMPAIGN = "cliqz_campaign";
    private static final String KEY_ADVERT_ID = "advert_id";

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    public InstallReferrerReceiver() {
        super();
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String referrer = intent.getStringExtra("referrer");
        preferenceManager.setReferrerUrl(referrer);
        try {
            referrer = URLDecoder.decode(referrer, "UTF-8");
            final Map<String, String> parameters = new HashMap<>();
            final String[] pairs = referrer.split("&");
            for (String pair : pairs) {
                final String[] keyValuePair = pair.split("=");
                parameters.put(keyValuePair[0], keyValuePair[1]);
            }
            if (parameters.containsKey(KEY_CAMPAIGN)) {
                preferenceManager.setDistribution(parameters.get(KEY_CAMPAIGN));
            }
            if (parameters.containsKey(KEY_ADVERT_ID)) {
                preferenceManager.setAdvertID(parameters.get(KEY_ADVERT_ID));
            }
        } catch (UnsupportedEncodingException e) {
            Log.e(TAG, "Error decoding referrer", e);
            preferenceManager.setDistributionException(true);
        } finally {
            telemetry.sendLifeCycleSignal(TelemetryKeys.INSTALL);
        }
    }
}
