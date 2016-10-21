package com.cliqz.browser.settings;

import android.os.Bundle;
import android.preference.Preference;
import android.preference.PreferenceFragment;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.Telemetry;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 * @date 2015/11/06
 */
public abstract class BaseSettingsFragment extends PreferenceFragment
        implements Preference.OnPreferenceClickListener, Preference.OnPreferenceChangeListener {

    @Inject
    PreferenceManager mPreferenceManager;

    // Removed as version 1.0.2r2
    // @Inject
    // ProxyUtils mProxyUtils;

    @Inject
    HistoryDatabase mHistoryDatabase;

    @Inject
    Telemetry mTelemetry;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        BrowserApp.getAppComponent().inject(this);
    }
}
