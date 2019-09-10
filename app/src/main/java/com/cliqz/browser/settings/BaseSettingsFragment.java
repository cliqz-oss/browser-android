package com.cliqz.browser.settings;

import android.os.Bundle;
import android.preference.Preference;
import android.preference.PreferenceFragment;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.database.PasswordDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 */
public abstract class BaseSettingsFragment extends PreferenceFragment
        implements Preference.OnPreferenceClickListener, Preference.OnPreferenceChangeListener {

    @Inject
    PreferenceManager mPreferenceManager;

    @Inject
    HistoryDatabase mHistoryDatabase;

    @Inject
    PasswordDatabase passwordDatabase;

    @Inject
    Telemetry mTelemetry;

    @Inject
    SubscriptionsManager subscriptionsManager;

    @Inject
    Bus bus;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        BrowserApp.getAppComponent().inject(this);
    }
}
