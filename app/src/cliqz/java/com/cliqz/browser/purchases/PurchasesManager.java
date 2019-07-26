package com.cliqz.browser.purchases;

import android.content.Context;

import com.cliqz.browser.purchases.trial.ServerData;
import com.cliqz.nove.Bus;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * Stub class for Lumen flavor support
 */
public class PurchasesManager {

    @SuppressWarnings("unused")
    public PurchasesManager(Context context, Bus bus, PreferenceManager preferenceManager) {
        // No-op
    }

    public boolean isDashboardEnabled() {
        return false;
    }

    public void checkPurchases() {}

    public ServerData getServerData() {
        return null;
	}

    public String getSubscriptionTypeForTelemetry() {
        return "";
    }
}
