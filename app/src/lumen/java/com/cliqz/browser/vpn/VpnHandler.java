package com.cliqz.browser.vpn;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.RemoteException;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.EditText;

import com.cliqz.browser.R;
import com.cliqz.library.vpn.core.IOpenVPNServiceInternal;
import com.cliqz.library.vpn.LaunchVPN;
import com.cliqz.library.vpn.VpnProfile;
import com.cliqz.library.vpn.core.OpenVPNService;
import com.cliqz.library.vpn.core.ProfileManager;
import com.cliqz.library.vpn.core.VpnStatus;

/**
 * @author Ravjit Uppal
 */
class VpnHandler {

    private Activity mActivity;
    private Handler mMainHandler;
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

    public VpnHandler(Activity activity) {
        mActivity = activity;
        mMainHandler = new Handler(mActivity.getMainLooper());
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
            final Intent pauseVPN = new Intent(mActivity.getBaseContext(), OpenVPNService.class);
            pauseVPN.setAction(OpenVPNService.PAUSE_VPN);
            final Intent resumeVPN = new Intent(mActivity.getBaseContext(), OpenVPNService.class);
            resumeVPN.setAction(OpenVPNService.RESUME_VPN);
            final PendingIntent pauseVPNPending = PendingIntent.getService(mActivity.getBaseContext(), 0, pauseVPN, 0);
            final PendingIntent resumeVPNPending = PendingIntent.getService(mActivity.getBaseContext(), 0, resumeVPN, 0);
            //@TODO Look into why it happens.
            //Sometimes vpn gets stuck at connecting. Pausing and resuming the vpn guarantees that it connects 100% of the time
            mMainHandler.postDelayed(() -> {
                try {
                    pauseVPNPending.send();
                } catch (PendingIntent.CanceledException e) {
                    e.printStackTrace();
                }
            },3000);
            mMainHandler.postDelayed(() -> {
                try {
                    resumeVPNPending.send();
                } catch (PendingIntent.CanceledException e) {
                    e.printStackTrace();
                }
            },5000);
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
}
