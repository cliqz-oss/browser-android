package com.cliqz.browser.main;

import androidx.fragment.app.Fragment;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * A fragment with a bus that register/unregister itself (children) to it automatically
 *
 * @author Stefano Pacifici
 */
public abstract class FragmentWithBus extends Fragment {

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @Inject
    Timings timings;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    Engine engine;

    @Inject
    MainActivityHandler handler;

    public FragmentWithBus() {
        super();
    }

    @Override
    public void onStart() {
        super.onStart();
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        registerToBus();
    }

    @Override
    public void onStop() {
        super.onStop();
        bus.unregister(this);
    }

    protected void registerToBus() {
        bus.register(this);
    }

    protected void setDisplayHomeAsUpEnabled(boolean value) {
        final AppCompatActivity activity = (AppCompatActivity) getActivity();
        final ActionBar actionBar = activity != null ? activity.getSupportActionBar() : null;
        if (actionBar != null) {
            actionBar.setDisplayHomeAsUpEnabled(value);
        }
    }
}
