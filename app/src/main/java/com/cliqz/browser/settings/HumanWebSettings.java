/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;

import com.cliqz.browser.R;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.TelemetryKeys;

public class HumanWebSettings extends BaseSettingsFragment
        implements Preference.OnPreferenceChangeListener, Preference.OnPreferenceClickListener {

    private static final String WHAT_IS_IT_KEY = "whatisit";
    private static final String HUMANWEB_KEY = "humanweb";
    private static final String[] KEYS = new String[] {
            WHAT_IS_IT_KEY, HUMANWEB_KEY
    };
    private long startTime;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.HUMAN_WEB, TelemetryKeys.MAIN);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_humaweb);

        for (String key: KEYS) {
            final Preference preference = findPreference(key);
            preference.setOnPreferenceChangeListener(this);
            preference.setOnPreferenceClickListener(this);
            if (HUMANWEB_KEY.equals(key)) {
                ((CheckBoxPreference) preference)
                        .setChecked(mPreferenceManager.getHumanWebEnabled());
            }
        }
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        if (HUMANWEB_KEY.equals(preference.getKey())) {
            mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE, TelemetryKeys.HUMAN_WEB,
                    !((Boolean) newValue));
            mPreferenceManager.setHumanWebEnabled((Boolean) newValue);
            return true;
        }
        return false;
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        if (WHAT_IS_IT_KEY.equals(preference.getKey())) {
            mTelemetry.sendSettingsMenuSignal(TelemetryKeys.INFO, TelemetryKeys.HUMAN_WEB);
            final String url = getString(R.string.about_humanweb_url);
            final Intent intent = new Intent(getActivity(), MainActivity.class);
            intent.setAction(Intent.ACTION_VIEW);
            intent.setData(Uri.parse(url));
            startActivity(intent);
            return true;
        }
        return false;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.HUMAN_WEB, System.currentTimeMillis() - startTime);
    }
}
