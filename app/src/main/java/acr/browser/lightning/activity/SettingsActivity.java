/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.activity;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.v7.widget.Toolbar;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ListView;

import com.anthonycr.grant.PermissionsManager;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.CustomChooserIntent;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.TelemetryKeys;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import javax.inject.Inject;

import javax.inject.Inject;

public class SettingsActivity extends ThemableSettingsActivity {

    private static final String feedbackUrlEn = "https://cliqz.com/en/support";
    private static final String feedbackUrlDe = "https://cliqz.com/de/support";
    private static final String reportUrlEn = "https://cliqz.com/en/report-url";
    private static final String reportUrlDe = "https://cliqz.com/report-url";

    @Inject
    Telemetry telemetry;

    private static class HeaderInfo {
        final String name;
        final long id;

        HeaderInfo(String name, long id) {
            this.name = name;
            this.id = id;
        }
    }

    private static final List<HeaderInfo> fragments = new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        BrowserApp.getAppComponent().inject(this);
        // this is a workaround for the Toolbar in PreferenceActitivty
        ViewGroup root = (ViewGroup) findViewById(android.R.id.content);
        LinearLayout content = (LinearLayout) root.getChildAt(0);
        LinearLayout toolbarContainer = (LinearLayout) View.inflate(this, R.layout.toolbar_settings, null);

        root.removeAllViews();
        toolbarContainer.addView(content);
        root.addView(toolbarContainer);

        // now we can set the Toolbar using AppCompatPreferenceActivity
        Toolbar toolbar = (Toolbar) toolbarContainer.findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
    }

    @Override
    public void onBuildHeaders(List<Header> target) {
        loadHeadersFromResource(R.xml.preferences_headers, target);
        fragments.clear();
        for (Header header : target) {
            fragments.add(new HeaderInfo(header.fragment, header.id));
        }
    }

    @Override
    protected boolean isValidFragment(String fragmentName) {
        for (HeaderInfo info: fragments) {
            if (fragmentName.equals(info.name)) {
                return true;
            }
        }
        return false;
    }

    @Override
    protected void onListItemClick(ListView l, View v, int position, long id) {
        final HeaderInfo info = fragments.get(position);
        if (info.id == R.id.imprint) {
            telemetry.sendSettingsMenuSignal(TelemetryKeys.IMPRINT, TelemetryKeys.MAIN);
            openUrl("https://cliqz.com/legal");
        } else if (info.id == R.id.feedback) {
            telemetry.sendSettingsMenuSignal(TelemetryKeys.CONTACT, TelemetryKeys.MAIN);
            final String feedbackUrl = Locale.getDefault().getLanguage().equals("de") ?
                    feedbackUrlDe : feedbackUrlEn;
            openUrl(feedbackUrl);
        } else if (info.id == R.id.rate_us) {
            startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.cliqz.browser")));
        } else if (info.id == R.id.tips_and_tricks) {
            telemetry.sendSettingsMenuSignal(TelemetryKeys.TIPS_AND_TRICKS, TelemetryKeys.MAIN);
            openUrl("https://cliqz.com/tips-android");
        } else if (info.id == R.id.report_site) {
            final String reportUrl = Locale.getDefault().getLanguage().equals("de") ?
                    reportUrlDe : reportUrlEn;
            openUrl(reportUrl);
        } else {
            super.onListItemClick(l, v, position, id);
        }
    }

    private void openUrl(String url) {
        final Intent browserIntent = new Intent(this, MainActivity.class);
        browserIntent.setAction(Intent.ACTION_VIEW);
        browserIntent.setData(Uri.parse(url));
        startActivity(browserIntent);
        finish();
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        finish();
        return true;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        PermissionsManager.getInstance().notifyPermissionsChange(permissions, grantResults);
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }

}
