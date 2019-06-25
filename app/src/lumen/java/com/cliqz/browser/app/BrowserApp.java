package com.cliqz.browser.app;

import android.net.Uri;
import android.text.TextUtils;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.purchases.PurchasesManager;
import com.revenuecat.purchases.Purchases;

import javax.inject.Inject;

import de.blinkt.openvpn.ConfigConverter;
import de.blinkt.openvpn.core.ProfileManager;
import de.blinkt.openvpn.core.StatusListener;
import io.sentry.Sentry;
import io.sentry.android.AndroidSentryClientFactory;

/**
 * @author Ravjit Uppal
 */
public class BrowserApp extends BaseBrowserApp {

    @Inject
    PurchasesManager purchasesManager;

    @Override
    public void init() {
        importVpnProfiles();
        final StatusListener mStatus = new StatusListener();
        mStatus.init(getApplicationContext());

        setupCrashReporting();

        getAppComponent().inject(this);
        setupSubscriptionSDK();
    }

    //@TODO Remove hardcoded imports once the integration with server is done
    private void importVpnProfiles() {
        final ProfileManager profileManager = ProfileManager.getInstance(getApplicationContext());
        if (profileManager.getProfileByName("austria-vpn") == null) {
            final Uri usVpnUri = Uri.parse("android.resource://" + getPackageName() + "/raw/austria");
            final ConfigConverter usConvertor = new ConfigConverter(getApplicationContext());
            usConvertor.startImportTask(usVpnUri, "austria-vpn");
        }
    }

    private void setupCrashReporting() {
        if (!TextUtils.isEmpty(BuildConfig.SENTRY_TOKEN)) {
            Sentry.init(BuildConfig.SENTRY_TOKEN, new AndroidSentryClientFactory(this));
        }
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
