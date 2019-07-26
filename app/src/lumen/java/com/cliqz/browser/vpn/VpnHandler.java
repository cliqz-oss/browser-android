package com.cliqz.browser.vpn;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.purchases.PurchasesManager;

import javax.inject.Inject;

import de.blinkt.openvpn.LaunchVPN;
import de.blinkt.openvpn.VpnProfile;
import de.blinkt.openvpn.core.IOpenVPNServiceInternal;
import de.blinkt.openvpn.core.OpenVPNService;
import de.blinkt.openvpn.core.ProfileManager;
import de.blinkt.openvpn.core.VpnStatus;

/**
 * @author Ravjit Uppal
 */
public class VpnHandler {

    private Activity mActivity;
    private IOpenVPNServiceInternal mService;
    private ServiceConnection mConnection = new ServiceConnection() {

        @Override
        public void onServiceConnected(ComponentName className,
                                       IBinder service) {
            mService = IOpenVPNServiceInternal.Stub.asInterface(service);
        }

        @Override
        public void onServiceDisconnected(ComponentName arg0) {
            mService = null;
        }

    };

    @Inject
    PurchasesManager purchasesManager;

    public VpnHandler(Activity activity) {
        mActivity = activity;
        FlavoredActivityComponent activityComponent = BrowserApp.getActivityComponent(mActivity);
        if (activityComponent != null) {
            activityComponent.inject(this);
        }
    }

    void onResume() {
        final Intent intent = new Intent(mActivity.getBaseContext(), OpenVPNService.class);
        intent.setAction(OpenVPNService.START_SERVICE);
        mActivity.getBaseContext().bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
    }

    void onPause() {
        mActivity.getBaseContext().unbindService(mConnection);
    }

    void connectVpn(VpnProfile vpnProfile) {
        if (vpnProfile.mUsername.isEmpty()) {
            vpnProfile.mUsername = purchasesManager.getServerData().getUserName();
            vpnProfile.mPassword = purchasesManager.getServerData().getPassword();
            ProfileManager.getInstance(mActivity.getBaseContext()).saveProfile(mActivity.getBaseContext(), vpnProfile);
        }
        ProfileManager.updateLRU(mActivity.getBaseContext(), vpnProfile);
        final LaunchVPN launchVPN = new LaunchVPN(vpnProfile, mActivity);
        launchVPN.launchVPN();
    }

    void disconnectVpn() {
        ProfileManager.setConntectedVpnProfileDisconnected(mActivity.getBaseContext());
        if (mService != null) {
            try {
                mService.stopVPN(false);
            } catch (RemoteException e) {
                VpnStatus.logException(e);
            }
        }
    }

    public boolean isVpnConnected() {
        return VpnStatus.isVPNConnected();
    }
}
