package com.cliqz.browser.purchases;

import acr.browser.lightning.preference.PreferenceManager;

import android.content.Context;

import com.cliqz.nove.Bus;

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
}
