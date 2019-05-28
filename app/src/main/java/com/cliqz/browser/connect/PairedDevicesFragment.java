package com.cliqz.browser.connect;

import android.Manifest;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.text.Spannable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.anthonycr.grant.PermissionsManager;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.peercomm.PeerCommunicationService;
import com.cliqz.browser.qrscanner.PairingCaptureFragment;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.cliqz.utils.SpannableUtils;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Stefano Pacifici
 */
public class PairedDevicesFragment extends Fragment implements ServiceConnection {

    private static final String TAG = PairedDevicesFragment.class.getSimpleName();

    @Inject
    Bus bus;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Bind(R.id.paired_devices_list)
    RecyclerView devicesList;

    @Bind(R.id.pairing_information)
    View pairingInformation;

    @Bind(R.id.pairing_information_text)
    TextView pairingInformationText;

    private DevicesAdapter mAdapter;

    // Relaxed visibility for the DevicesAdapter
    PeerCommunicationService mService;

    // Used to retry to post the peer identifier in case of errors
    private String mLastCodeRead;
    private long startTime;
    private long mConnectionStartedTime;

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.fragment_pairing, container, false);
        ButterKnife.bind(this, view);
        devicesList.setHasFixedSize(true);
        devicesList.setLayoutManager(new LinearLayoutManager(inflater.getContext()));
        mAdapter = new DevicesAdapter(this);
        devicesList.setAdapter(mAdapter);
        final Spannable text = SpannableUtils.markdownStringToSpannable(inflater.getContext(),
                R.string.pairing_information);
        pairingInformationText.setText(text);
        return view;
    }

    @OnClick(R.id.action_add_device)
    void addDevice() {
        telemetry.sendConnectSignal(TelemetryKeys.ADD);
        if (PermissionsManager.hasPermission(getContext(), Manifest.permission.CAMERA)) {
            displayCaptureFragment();
        } else {
            PermissionsManager.getInstance()
                    .requestPermissionsIfNecessaryForResult(this,
                            new CameraPermissionAction(this),
                            Manifest.permission.CAMERA);
        }
    }

    void displayCaptureFragment() {
        final FragmentManager manager = getActivity().getSupportFragmentManager();
        manager.beginTransaction()
                .addToBackStack("PAIRED_DEVICES")
                .add(android.R.id.content, new PairingCaptureFragment(), "Capture")
                .commitAllowingStateLoss();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        PermissionsManager.getInstance().notifyPermissionsChange(permissions, grantResults);
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        BrowserApp.getAppComponent().inject(this);
        bus.register(this);
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        bus.unregister(this);
    }

    @Override
    public void onStart() {
        super.onStart();
        BrowserApp.getAppComponent().inject(this);
        final Context context = getContext();
        final Intent intent = new Intent(context, PeerCommunicationService.class);
        context.bindService(intent, this, Context.BIND_AUTO_CREATE);
        startTime = System.currentTimeMillis();
    }

    @Override
    public void onStop() {
        super.onStop();
        getContext().unbindService(this);
        telemetry.sendConnectHideSignal(System.currentTimeMillis() - startTime, TelemetryKeys.START);
    }

    @Override
    public void onDestroyView() {
        ButterKnife.unbind(this);
        mAdapter = null;
        super.onDestroyView();
    }

    @Subscribe
    public void pushPairingData(CliqzMessages.PushPairingData data) {
        if (mAdapter == null) {
            return;
        }
        final ArrayList<DevicesListEntry> entries = new ArrayList<>();
        final JSONArray devices = data.json.optJSONArray("devices");
        int totalDeviceCount = 0;
        int connectedDeviceCount = 0;
        for (int i = 0; i < devices.length(); i++) {
            try {
                final JSONObject entry = devices.getJSONObject(i);
                final DevicesListEntry deviceEntry = new DevicesListEntry(entry);
                entries.add(deviceEntry);
                totalDeviceCount++;
                if (deviceEntry.state == DeviceState.CONNECTED) {
                    connectedDeviceCount++;
                }
            } catch (JSONException e) {
                Log.i(TAG, "Invalid json array entry", e);
            }
        }
        telemetry.sendConnectShowSignal(totalDeviceCount, connectedDeviceCount);
        if (entries.size() > 0) {
            mAdapter.setEntries(entries);
            pairingInformation.setVisibility(View.GONE);
            devicesList.setVisibility(View.VISIBLE);
            checkIfFirstPairedDevice();
        } else {
            pairingInformation.setVisibility(View.VISIBLE);
            devicesList.setVisibility(View.INVISIBLE);
        }
    }

    // We want to show a dialog if we have just paired the first device
    private void checkIfFirstPairedDevice() {
        if (preferenceManager.getFirstDevicePaired()) {
            return;
        }

        preferenceManager.setFirstDevicePaired(true);
        FirstPairedDeviceDialog.show(this);
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void pairingError(CliqzMessages.NotifyPairingError ignored) {
        // Just display an error dialog
        telemetry.sendConnectPairingSignal(System.currentTimeMillis() - mConnectionStartedTime, false);
        PairingErrorDialog.show(this);
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void pairingSuccess(CliqzMessages.NotifyPairingSuccess ignored) {
        telemetry.sendConnectPairingSignal(System.currentTimeMillis() - mConnectionStartedTime, true);
        if (mService != null) {
            mService.requestPairingData();
        }
    }

    @Subscribe
    public void onQRScannerResult(SyncEvents.QRCodeScanned message) {
        mLastCodeRead = message.result.getText();
        mConnectionStartedTime = System.currentTimeMillis();
    }

    void retry() {
        if (mService == null || mLastCodeRead == null) {
            return;
        }
        mService.addPeer(mLastCodeRead);
    }

    @Override
    public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
        mService = PeerCommunicationService.getFromBinder(iBinder);
        if (mService != null) {
            mService.requestPairingData();
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName componentName) {
        mService = null;
    }

}
