package com.cliqz.browser.overview;

import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;

import androidx.fragment.app.Fragment;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;

public class CommonOverviewFragment extends Fragment {

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @Override
    public void onStart() {
        super.onStart();
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
            bus.register(this);
        }
    }

    public CommonOverviewFragment() {
        setHasOptionsMenu(true);
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        inflater.inflate(R.menu.fragment_overview_menu, menu);
        super.onCreateOptionsMenu(menu, inflater);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        // All the options close the current visible page
        final int id = item.getItemId();
        switch (id) {
            case R.id.action_new_tab:
                telemetry.sendMainMenuSignal(TelemetryKeys.NEW_TAB, false, TelemetryKeys.OVERVIEW);
                bus.post(new BrowserEvents.NewTab(false));
                return true;
            case R.id.action_new_forget_tab:
                telemetry.sendMainMenuSignal(TelemetryKeys.NEW_FORGET_TAB, false,
                        TelemetryKeys.OVERVIEW);
                bus.post(new BrowserEvents.NewTab(true));
                return true;
            case R.id.action_settings:
                telemetry.sendMainMenuSignal(TelemetryKeys.SETTINGS, false, TelemetryKeys.OVERVIEW);
                if (bus != null) {
                    bus.post(new Messages.GoToSettings());
                }
                return true;
            case R.id.action_close_all_tabs:
                telemetry.sendMainMenuSignal(TelemetryKeys.CLOSE_ALL_TABS, false,
                        TelemetryKeys.OVERVIEW);
                bus.post(new BrowserEvents.CloseAllTabs());
                return true;
            default:
                return false;
        }
    }
}
