package com.cliqz.browser.connect;

import android.annotation.SuppressLint;
import android.content.ComponentName;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Bundle;
import android.os.IBinder;
import android.support.v4.app.FragmentManager;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.view.MenuItem;
import android.view.ViewGroup.LayoutParams;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.peercomm.PeerCommunicationService;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

public class SyncActivity extends AppCompatActivity implements ServiceConnection {

    private static final String TAG = SyncActivity.class.getSimpleName();
    private static final String TOP_LEVEL_FRAGMENT = TAG + "." + PairedDevicesFragment.class.getSimpleName();

    private PeerCommunicationService mService = null;
    private String mPeerInfo;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @SuppressLint("PrivateResource")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setTheme(android.support.v7.appcompat.R.style.Theme_AppCompat_Light);
        super.onCreate(savedInstanceState);
        setupActionBar();

        FrameLayout mMainContainer = new FrameLayout(this);
        mMainContainer.setLayoutParams(new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        mMainContainer.setId(android.R.id.content);
        setContentView(mMainContainer);

        BrowserApp.getAppComponent().inject(this);

        final FragmentManager fm = getSupportFragmentManager();
        fm.beginTransaction()
                .add(android.R.id.content, new PairedDevicesFragment(), TOP_LEVEL_FRAGMENT)
                .commit();
    }

    private void setupActionBar() {
        final ActionBar actionBar = this.getSupportActionBar();
        if (actionBar == null) {
            return;
        }

        actionBar.setDisplayHomeAsUpEnabled(true);
        actionBar.setTitle(R.string.title_connect);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                final FragmentManager fm = getSupportFragmentManager();
                telemetry.sendConnectBackSignal();
                if (fm.getBackStackEntryCount() > 0) {
                    fm.popBackStack();
                } else {
                    finish();
                }
                return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onResume() {
        super.onResume();
        bus.register(this);
    }

    @Override
    protected void onPause() {
        bus.unregister(this);
        super.onPause();
    }

    @Override
    protected void onStart() {
        super.onStart();
        final Intent intent = new Intent(this, PeerCommunicationService.class);
        bindService(intent, this, BIND_AUTO_CREATE);
    }

    @Override
    protected void onStop() {
        super.onStop();
        unbindService(this);
    }

    @Override
    public void onServiceConnected(ComponentName componentName, IBinder iBinder) {
        mService = PeerCommunicationService.getFromBinder(iBinder);
        if (mPeerInfo != null && !mPeerInfo.isEmpty()) {
            mService.addPeer(mPeerInfo);
            mPeerInfo = null;
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName componentName) {
        mService = null;
    }

    @Subscribe
    public void onQRScannerResult(SyncEvents.QRCodeScanned message) {
        if (mService == null) {
            mPeerInfo = message.result.getText();
        } else {
            mService.addPeer(message.result.getText());
        }
    }
}
