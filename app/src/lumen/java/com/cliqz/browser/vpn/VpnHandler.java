package com.cliqz.browser.vpn;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.os.RemoteException;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

import de.blinkt.openvpn.LaunchVPN;
import de.blinkt.openvpn.VpnProfile;
import de.blinkt.openvpn.core.ConnectionStatus;
import de.blinkt.openvpn.core.IOpenVPNServiceInternal;
import de.blinkt.openvpn.core.OpenVPNService;
import de.blinkt.openvpn.core.ProfileManager;
import de.blinkt.openvpn.core.VpnStatus;

/**
 * @author Ravjit Uppal
 */
public class VpnHandler implements VpnStatus.StateListener {

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
    Bus bus;

    public VpnHandler(Activity activity) {
        mActivity = activity;
        FlavoredActivityComponent activityComponent = BrowserApp.getActivityComponent(mActivity);
        if (activityComponent != null) {
            activityComponent.inject(this);
            bus.register(this);
        }
        VpnStatus.addStateListener(this);
    }

    void onResume() {
        final Intent intent = new Intent(mActivity.getBaseContext(), OpenVPNService.class);
        intent.setAction(OpenVPNService.START_SERVICE);
        mActivity.getBaseContext().bindService(intent, mConnection, Context.BIND_AUTO_CREATE);
    }

    void onPause() {
        mActivity.getBaseContext().unbindService(mConnection);
    }

    void connectVpn() {
        //@TODO remove dialog box when server integration is done
        final LayoutInflater inflater = (LayoutInflater) mActivity.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        final View vpnInputView = inflater.inflate(R.layout.vpn_input_field, null);
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setView(vpnInputView);
        builder.setPositiveButton(R.string.action_connect, (dialogInterface, i) -> {
            final ProfileManager m = ProfileManager.getInstance(mActivity.getBaseContext());
            final VpnProfile vpnProfile = m.getProfileByName("austria-vpn");

            vpnProfile.mUsername = ((EditText)(vpnInputView.findViewById(R.id.vpn_user_name))).getText().toString();
            vpnProfile.mPassword = ((EditText)(vpnInputView.findViewById(R.id.vpn_password))).getText().toString();
            final LaunchVPN launchVPN = new LaunchVPN(vpnProfile, mActivity);

            launchVPN.launchVPN();
        });
        builder.show();
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

    @Subscribe
    public void onVpnPermissionGranted(Messages.OnVpnPermissionGranted onVpnPermissionGranted) {
        connectVpn();
    }

    public boolean isVpnConnected() {
        return VpnStatus.isVPNConnected();
    }

    @Override
    public void updateState(String s, String s1, int i, ConnectionStatus connectionStatus) {
        bus.post(new Messages.onVpnStateChange());
    }

    @Override
    public void setConnectedVPN(String s) {

    }
}
