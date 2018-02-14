package com.cliqz.browser.telemetry;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BaseComponent;
import com.cliqz.browser.app.BaseModule;
import com.cliqz.browser.app.DaggerBaseComponent;

import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * This class receives the install referrer when the app is installed.
 * It then extracts utm_source and utm_content from the referrer string and concatenates both values
 * with an underscore, which is then used in telemetry signals.
 *
 * @author Ravjit Uppal
 */
public class InstallReferrerReceiver extends BroadcastReceiver {

    private static final String TAG = InstallReferrerReceiver.class.getSimpleName();
    private static final String KEY_CAMPAIGN = "cliqz_campaign";
    private static final String KEY_ADVERT_ID = "advert_id";
    private static final String KEY_CAMPAIGN_ID = "campaignid";

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Override
    public void onReceive(Context context, Intent intent) {
        inject(context);
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
            } else if (parameters.containsKey(KEY_CAMPAIGN_ID)){
                preferenceManager.setDistribution(parameters.get(KEY_CAMPAIGN_ID));
            }
            if (parameters.containsKey(KEY_ADVERT_ID)) {
                preferenceManager.setAdvertID(parameters.get(KEY_ADVERT_ID));
            }
        } catch (Throwable e) {
            Log.e(TAG, "Error decoding referrer", e);
            preferenceManager.setDistributionException(true);
        } finally {
            telemetry.sendLifeCycleSignal(TelemetryKeys.INSTALL);
        }
    }

    private void inject(Context context) {
        final AppComponent appComponent = BrowserApp.getAppComponent();
        if (appComponent != null) {
            appComponent.inject(this);
        } else {
            BaseComponent component = DaggerBaseComponent.builder().baseModule(new BaseModule(context)).build();
            component.inject(this);
        }
    }
}
