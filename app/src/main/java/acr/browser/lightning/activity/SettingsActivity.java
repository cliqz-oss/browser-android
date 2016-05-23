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
import com.cliqz.browser.main.MainActivity;

import java.util.ArrayList;
import java.util.List;

public class SettingsActivity extends ThemableSettingsActivity {

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
            final Intent browserIntent = new Intent(this, MainActivity.class);
            browserIntent.setAction(Intent.ACTION_VIEW);
            browserIntent.setData(Uri.parse("https://cliqz.com/legal"));
            startActivity(browserIntent);
            finish();
        } else if (info.id == R.id.feedback) {
            final Uri to = Uri.parse(String.format("mailto:%s?subject=%s",
                    getString(R.string.feedback_at_cliqz_dot_com),
                    Uri.encode(getString(R.string.feedback_mail_subject))));
            final Intent intent = new Intent(Intent.ACTION_SENDTO, to);
            intent.putExtra(Intent.EXTRA_TEXT, new StringBuilder()
                            .append("\n")
                            .append("Feedback für CLIQZ for Android (")
                            .append(BuildConfig.VERSION_NAME)
                            .append("), auf ")
                            .append(Build.MODEL)
                            .append(" (")
                            .append(Build.VERSION.SDK_INT)
                            .append(")")
                            .toString()
            );
            startActivity(Intent.createChooser(intent, getString(R.string.contact_cliqz)));
        } else {
            super.onListItemClick(l, v, position, id);
        }
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
