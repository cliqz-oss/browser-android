package com.cliqz.browser.app;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.purchases.PurchasesManager;
import com.revenuecat.purchases.Purchases;

import javax.inject.Inject;

import de.blinkt.openvpn.core.StatusListener;

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

        getAppComponent().inject(this);
        setupSubscriptionSDK();
    }

    private void setupSubscriptionSDK() {
        //noinspection ConstantConditions
        if (!BuildConfig.REVENUECAT_API_KEY.isEmpty()) {
            Purchases.setDebugLogsEnabled(BuildConfig.DEBUG);
            Purchases.configure(this, BuildConfig.REVENUECAT_API_KEY);
            purchasesManager.checkPurchases();
        }
    }
}
