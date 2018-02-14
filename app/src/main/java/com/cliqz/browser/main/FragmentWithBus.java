package com.cliqz.browser.main;

import android.support.v4.app.Fragment;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.webview.CliqzBridge;
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
    CliqzBridge cliqzBridge;

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
        final MainActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        registerToBus();
    }

    protected void registerToBus() {
        bus.register(this);
    }
}
