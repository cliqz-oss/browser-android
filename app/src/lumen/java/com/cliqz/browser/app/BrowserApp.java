package com.cliqz.browser.app;

import android.net.Uri;

import com.cliqz.browser.BuildConfig;
import com.cliqz.library.vpn.ConfigConverter;
import com.cliqz.library.vpn.core.ProfileManager;
import com.cliqz.library.vpn.core.StatusListener;
import com.revenuecat.purchases.Purchases;

/**
 * @author Ravjit Uppal
 */
public class BrowserApp extends BaseBrowserApp {

    @Override
    public void init() {
        importVpnProfiles();
        final StatusListener mStatus = new StatusListener();
        mStatus.init(getApplicationContext());

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

    private void setupSubscriptionSDK() {
        Purchases.setDebugLogsEnabled(BuildConfig.DEBUG);
        Purchases.configure(this, BuildConfig.REVENUECAT_API_KEY);
    }

}
