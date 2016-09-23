/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.preference.Preference;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.utils.TelemetryKeys;

public class AboutSettingsFragment extends BaseSettingsFragment {

    private int mCounter = 1;

    private static final String SETTINGS_VERSION = "pref_version";
    private static final String AMAZON_ARN = "pref_arn";
    private static final String CONTACT = "pref_contact";
    private long startTime;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ABOUT, TelemetryKeys.MAIN);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_about);

        Preference version = findPreference(SETTINGS_VERSION);
        version.setSummary(getVersion());
        version.setOnPreferenceClickListener(versionClickListener);

        Preference arn = findPreference(AMAZON_ARN);
        if (BuildConfig.DEBUG) {
            final String ARN = mPreferenceManager.getARNEndpoint();
            final String[] pieces = ARN != null ? ARN.split("/") : new String[]{"No ARN yet"};
            final String hash = pieces[pieces.length - 1];
            arn.setSummary(hash);
        } else {
            getPreferenceScreen().removePreference(arn);
        }
    }

    private String getVersion() {
        final String version = BuildConfig.VERSION_NAME;
        return getString(R.string.about_version_format, version);
    }

    private final Preference.OnPreferenceClickListener versionClickListener =
            new Preference.OnPreferenceClickListener() {
                @Override
                public boolean onPreferenceClick(Preference preference) {
                    if (mCounter < 10) {
                        mCounter++;
                        return false;
                    } else {
                        final Intent intent = new Intent(Intent.ACTION_VIEW,
                                Uri.parse("http://i.imgur.com/4lpVkTS.gif"));
                        getActivity().startActivity(intent);
                        mCounter = 0;
                        return true;
                    }
                }
            };

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        return false;
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        return false;
    }

    public void onDestroy() {
        super.onDestroy();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ABOUT, System.currentTimeMillis() - startTime);
    }
}
