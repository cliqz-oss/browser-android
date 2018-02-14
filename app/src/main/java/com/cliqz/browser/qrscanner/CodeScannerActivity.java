package com.cliqz.browser.qrscanner;

import android.app.SearchManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v4.app.FragmentManager;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.view.MenuItem;
import android.webkit.URLUtil;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.connect.SyncEvents;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

/**
 * @author Stefano Pacifici
 */
public class CodeScannerActivity extends AppCompatActivity {

    @Inject
    Bus bus;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        setTheme(android.support.v7.appcompat.R.style.Theme_AppCompat_Light);
        super.onCreate(savedInstanceState);
        final ActionBar actionBar = getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayOptions(ActionBar.DISPLAY_HOME_AS_UP |
                    ActionBar.DISPLAY_SHOW_HOME | ActionBar.DISPLAY_SHOW_TITLE);
            actionBar.setHomeButtonEnabled(true);
            actionBar.setTitle(R.string.code_scanner_title);
        }
        BrowserApp.getAppComponent().inject(this);

        final FrameLayout content = new FrameLayout(this);
        content.setId(android.R.id.content);
        setContentView(content);

        final FragmentManager fragmentManager = getSupportFragmentManager();
        fragmentManager.beginTransaction()
                .add(android.R.id.content, new CodeScannerCaptureFragment(), null)
                .commit();
    }

    @Override
    protected void onResume() {
        super.onResume();
        bus.register(this);
    }

    @Override
    protected void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Subscribe
    void onCodeScanned(SyncEvents.QRCodeScanned event) {
        final String result = event.result.getText();
        if (result == null || result.isEmpty()) {
            return;
        }

        final Uri uri = Uri.parse(result);
        final Intent intent = new Intent(this, MainActivity.class);
        if (uri != null && URLUtil.isValidUrl(result)) {
            intent.setData(uri);
            intent.setAction(Intent.ACTION_VIEW);
        } else {
            intent.setAction(Intent.ACTION_WEB_SEARCH);
            intent.putExtra(SearchManager.QUERY, result);
        }
        startActivity(intent);
        finish();
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            case android.R.id.home:
                finish();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }
}
