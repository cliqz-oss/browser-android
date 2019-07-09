/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.os.Bundle;
import android.preference.Preference;
import android.provider.Settings;
import android.widget.Toast;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.abtesting.AvailableTests;
import com.cliqz.browser.telemetry.TelemetryKeys;

public class AboutSettingsFragment extends BaseSettingsFragment {

    private int mAppVerCounter = 1;
    private int mExtVerCounter = 1;

    private static final String SETTINGS_VERSION = "pref_version";
    private static final String EXTENSION_VERSION = "pref_ext_ver";
    private static final String AMAZON_ARN = "pref_arn";
    private static final String SETTING_EULA = "pref_eula";
    private long startTime;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ABOUT, TelemetryKeys.MAIN);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preferences_about);

        final Preference version = findPreference(SETTINGS_VERSION);
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

        final Preference extVersion = findPreference(EXTENSION_VERSION);
        extVersion.setSummary(BuildConfig.CLIQZ_EXT_VERSION);
        extVersion.setOnPreferenceClickListener(extensionClickListener);
    }

    private String getVersion() {
        final String version = BuildConfig.VERSION_NAME;
        return getString(R.string.about_version_format, version);
    }

    private final Preference.OnPreferenceClickListener versionClickListener =
            preference -> {
                if (mAppVerCounter < 10) {
                    mAppVerCounter++;
                    return false;
                } else {
                    Toast.makeText(getActivity(),
                            Settings.Secure.getString(getActivity().getContentResolver(), Settings.Secure.ANDROID_ID),
                            Toast.LENGTH_LONG).show();
                    mAppVerCounter = 0;
                    return true;
                }
            };

    private final Preference.OnPreferenceClickListener extensionClickListener =
            preference -> {
                if (mExtVerCounter < 10) {
                    mExtVerCounter++;
                    return false;
                } else {
                    for (AvailableTests test: AvailableTests.values()) {
                        mPreferenceManager.setABTestPreference(test.preferenceName, true);
                    }
                    Toast.makeText(getActivity(), "All features activated", Toast.LENGTH_SHORT).show();
                    return true;
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
