package com.cliqz.browser.vpn;

import android.app.Activity;

/**
 * @author Ravjit Uppal
 *
 * Placeholder class for flavour abstraction
 */
public class VpnHandler {

    public interface OnServiceBindListener {
        public void onServiceBind();
    }

    public VpnHandler(Activity activity) {
    }

    public boolean isVpnConnected() {
        return false;
    }

    public void disconnectVpn(){}

    public void unbindService(){}

    public void bindService(OnServiceBindListener onServiceBindListener){}
}
