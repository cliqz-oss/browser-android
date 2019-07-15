package com.cliqz.browser.vpn;

import android.app.Dialog;
import android.view.View;

import androidx.fragment.app.FragmentManager;

/**
 * @author Ravjit Uppal
 *
 * Placeholder class for flavour abstraction
 */
public class VpnPanel {

    public static final int VPN_LAUNCH_REQUEST_CODE = 70;
    public static final String ACTION_DISCONNECT_VPN = null;

    public static VpnPanel create(View view) {
        return null;
    }

    public void show(FragmentManager fragmentManager, String tag) {
    }

    public boolean isVisible() {
        return false;
    }

    public Dialog getDialog() {
        return null;
    }
}
