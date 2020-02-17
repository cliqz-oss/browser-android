package com.cliqz.browser.qrscanner;

import android.app.SearchManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import android.view.MenuItem;
import android.webkit.URLUtil;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.cliqz.utils.ActivityUtils;

import javax.inject.Inject;

/**
 * @author Stefano Pacifici
 */
public class CodeScannerActivity extends AppCompatActivity {

    @Inject
    Bus bus;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        setTheme(androidx.appcompat.R.style.Theme_AppCompat_Light);
        super.onCreate(savedInstanceState);
        ActivityUtils.setNavigationBarColor(this, android.R.color.black);
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
