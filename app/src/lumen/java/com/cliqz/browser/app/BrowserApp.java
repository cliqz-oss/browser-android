package com.cliqz.browser.app;

import android.net.Uri;

import com.cliqz.library.vpn.ConfigConverter;
import com.cliqz.library.vpn.core.ProfileManager;
import com.cliqz.library.vpn.core.StatusListener;

/**
 * @author Ravjit Uppal
 */
public class BrowserApp extends BaseBrowserApp {

    @Override
    public void init() {
        importVpnProfiles();
        final StatusListener mStatus = new StatusListener();
        mStatus.init(getApplicationContext());
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

}
