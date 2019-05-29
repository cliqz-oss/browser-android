package com.cliqz.browser.helper;

import android.content.Intent;
import android.net.Uri;
import androidx.appcompat.app.AppCompatActivity;
import android.os.Bundle;
import android.widget.ToggleButton;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.OutputStream;

import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

public class MainActivity extends AppCompatActivity {

    private static final File ONBOARDING_OVERRIDE_FILE = new File("/sdcard/com.cliqz.browser.no_onboarding");

    @Bind(R.id.onboarding_toggle)
    ToggleButton onboardingToggle;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        ButterKnife.bind(this);
    }

    @Override
    protected void onResume() {
        super.onResume();

        updateOnBoardingToggle();
    }

    private void updateOnBoardingToggle() {
        onboardingToggle.setChecked(ONBOARDING_OVERRIDE_FILE.length() == 0);
    }

    @OnClick(R.id.open_url_action)
    void onOpenUrl() {
        final Intent intent = new Intent();
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"));
        final Intent chooser = Intent.createChooser(intent, getString(R.string.select_a_browser));
        startActivity(chooser);
    }

    @OnClick(R.id.send_msg_action)
    void onSendNewsMessage() {
        final NewsMessageDialog dialog = new NewsMessageDialog(this);
        dialog.show();
    }

    @OnClick(R.id.onboarding_toggle)
    void onToggle() {
        if (ONBOARDING_OVERRIDE_FILE.length() > 0) {
            ONBOARDING_OVERRIDE_FILE.delete();
        } else {
            try {
                final FileOutputStream out = new FileOutputStream(ONBOARDING_OVERRIDE_FILE);
                out.write("override".getBytes());
                out.flush();
                out.close();
            } catch (java.io.IOException e) {
                e.printStackTrace();
            }
        }
        updateOnBoardingToggle();
    }
}
