package com.cliqz.browser.app;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.CliqzConfig;
import com.cliqz.browser.purchases.PurchasesManager;
import com.revenuecat.purchases.Purchases;
import de.blinkt.openvpn.core.StatusListener;
import io.sentry.Sentry;
import io.sentry.android.AndroidSentryClientFactory;

import javax.inject.Inject;

/**
 * @author Ravjit Uppal
 */
public class BrowserApp extends BaseBrowserApp {

    @Inject
    PurchasesManager purchasesManager;

    @Override
    public void init() {
        final StatusListener mStatus = new StatusListener();
        mStatus.init(getApplicationContext());
        setupCrashReporting();
        getAppComponent().inject(this);
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
            purchasesManager.checkPurchases();
        }
    }

}
