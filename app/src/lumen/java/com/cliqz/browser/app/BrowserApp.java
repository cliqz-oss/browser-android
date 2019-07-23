package com.cliqz.browser.app;

import android.app.ActivityManager;
import android.content.Context;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.CliqzConfig;
import com.revenuecat.purchases.Purchases;

import de.blinkt.openvpn.core.StatusListener;
import io.sentry.Sentry;
import io.sentry.android.AndroidSentryClientFactory;

/**
 * @author Ravjit Uppal
 */
public class BrowserApp extends BaseBrowserApp {

    @Override
    public void init() {
        //We need the listener in both the processes
        final StatusListener mStatus = new StatusListener();
        mStatus.init(getApplicationContext());
        //If it's the vpn process we don't need to initialize any other library
        if (isVpnProcess()) {
            return;
        }
        //Initialize common libraries
        super.init();
        //Initialize flavour specific libraries
        setupCrashReporting();
        setupSubscriptionSDK();
    }

    private void setupCrashReporting() {
        //noinspection ConstantConditions
        if (!CliqzConfig.SENTRY_TOKEN.isEmpty()) {
            Sentry.init(CliqzConfig.SENTRY_TOKEN, new AndroidSentryClientFactory(this));
        }
    }

    private void setupSubscriptionSDK() {
        //noinspection ConstantConditions
        if (!CliqzConfig.REVENUECAT_API_KEY.isEmpty()) {
            Purchases.setDebugLogsEnabled(BuildConfig.DEBUG);
            Purchases.configure(this, CliqzConfig.REVENUECAT_API_KEY);
        }
    }

    private boolean isVpnProcess() {
        final ActivityManager manager = (ActivityManager) this.getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningAppProcessInfo processInfo : manager.getRunningAppProcesses()) {
            if (processInfo.pid == android.os.Process.myPid()) {
                if (processInfo.processName.equals("com.cliqz.lumen:openvpn")) {
                    return true;
                }
            }
        }
        return false;
    }

}
