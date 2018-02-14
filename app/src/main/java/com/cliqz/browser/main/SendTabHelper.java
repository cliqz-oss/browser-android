package com.cliqz.browser.main;

import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.ComponentName;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.support.annotation.NonNull;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.connect.DevicesListEntry;
import com.cliqz.browser.peercomm.PeerCommunicationService;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Subscribe;

import org.json.JSONArray;
import org.json.JSONException;

import java.util.ArrayList;

/**
 * @author Stefano Pacifici
 */
class SendTabHelper implements ServiceConnection {

    private static final String TAG = SendTabHelper.class.getSimpleName();

    private static final long SERVICE_CONNECTION_TIMEOUT = 200L;

    private final MainActivity activity;
    private final Handler handler;
    private final String url;
    private final boolean isIncognito;
    private final String title;

    private PeerCommunicationService mService;
    private ProgressDialog mProgressDialog;

    private SendTabHelper(MainActivity activity, String url, String title, boolean isIncognito) {
        this.activity = activity;
        this.handler = new Handler(Looper.getMainLooper());
        this.url = url;
        this.title = title;
        this.isIncognito = isIncognito;
    }

    static void sendTab(@NonNull MainActivity activity, @NonNull String url, @NonNull String title,
                        boolean isIncognito) {
        final SendTabHelper helper = new SendTabHelper(activity, url, title, isIncognito);
        helper.sendTab();
    }


    private void sendTab() {
        // Get the connections lists (meanwhile show a progress mProgressDialog)
        mProgressDialog = new ProgressDialog(activity);
        mProgressDialog.setIndeterminate(true);
        mProgressDialog.setMessage(activity.getString(R.string.please_wait));
        mProgressDialog.setCancelable(false);
        mProgressDialog.show();

        final Intent serviceIntent = new Intent(activity, PeerCommunicationService.class);
        activity.bindService(serviceIntent, this, Context.BIND_AUTO_CREATE);

        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                getPeerData();
            }
        }, SERVICE_CONNECTION_TIMEOUT);
    }

    private void getPeerData() {
        if (mService == null) {
            mProgressDialog.dismiss();
            SendTabErrorDialog.show(activity, SendTabErrorTypes.GENERIC_ERROR);
            return;
        }

        activity.bus.register(this);
        mService.requestPairingData();
    }

    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        mService = PeerCommunicationService.getFromBinder(service);
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        mService = null;
    }

    @Subscribe
    void pairingData(@NonNull CliqzMessages.PushPairingData pairingData) {
        mProgressDialog.dismiss();
        activity.bus.unregister(this);

        final JSONArray jsonDevices = pairingData.json.optJSONArray("devices");
        final ArrayList<DevicesListEntry> devices = new ArrayList<>();
        final int devicesNo = jsonDevices != null ? jsonDevices.length() : 0;
        for (int i = 0; i < devicesNo; i++) {
            try {
                devices.add(new DevicesListEntry(jsonDevices.getJSONObject(i)));
            } catch (JSONException e) {
                Log.e(TAG, "Invalid device descriptor");
            }
        }
        switch (devices.size()) {
            case 0:
                SendTabErrorDialog.show(activity, SendTabErrorTypes.NO_CONNECTION_ERROR);
                break;
            case 1:
                sendToDevice(devices.get(0).id);
                break;
            default:
                showDevicePicker(devices);
        }
    }

    private void showDevicePicker(final ArrayList<DevicesListEntry> devices) {
        final AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        final CharSequence[] dialogEntries = new CharSequence[devices.size()];
        for (int i = 0; i < dialogEntries.length; i++) {
            dialogEntries[i] = devices.get(i).name;
        }
        activity.telemetry.sendSendTabShowSignal();
        final long start = System.currentTimeMillis();
        builder.setTitle(R.string.send_tab_device_picker_title)
                .setItems(dialogEntries, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        final String id = devices.get(which).id;
                        sendToDevice(id);
                        final long now = System.currentTimeMillis();
                        activity.telemetry.sendSendTabDevicePickerClickSignal(
                                which, devices.size(), now - start);
                    }
                })
                .setCancelable(true)
                .setOnCancelListener(new DialogInterface.OnCancelListener() {
                    @Override
                    public void onCancel(DialogInterface dialog) {
                        cleanUp();
                        final long now = System.currentTimeMillis();
                        activity.telemetry.sendSendTabDevicePickerCancelledSignal(
                                devices.size(), now - start);
                    }
                })
                .show();
    }

    private void cleanUp() {
        activity.unbindService(this);
    }

    private void sendToDevice(String id) {
        final PeerCommunicationService service = mService;
        if (service == null) {
            SendTabErrorDialog.show(activity, SendTabErrorTypes.GENERIC_ERROR);
            cleanUp();
            return;
        }

        service.sendTabTo(id, url, title, isIncognito);
        cleanUp();
    }

}
