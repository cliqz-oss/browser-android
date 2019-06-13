package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.util.Log;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.SwitchCompat;
import androidx.fragment.app.FragmentManager;
import androidx.viewpager.widget.ViewPager;

import com.cliqz.browser.R;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.cliqz.jsengine.Insights;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.google.android.material.tabs.TabLayout;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterHelper implements ControlCenterActions {

    private View mControlCenterContainer;
    private ControlCenterPagerAdapter mControlCenterPagerAdapter;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    AntiTracking antiTracking;

    @Inject
    Adblocker adblocker;

    @Inject
    Bus bus;

    @Inject
    Insights insights;

    public ControlCenterHelper(@NonNull FragmentManager fragmentManager,
                               @NonNull Context context, View parent) {
        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
        bus.register(this);
        final ViewPager mControlCenterPager = parent.findViewById(R.id.control_center_pager);
        mControlCenterContainer = parent.findViewById(R.id.control_center_container);
        mControlCenterPagerAdapter = new ControlCenterPagerAdapter(fragmentManager, context);
        mControlCenterPagerAdapter.init();

        mControlCenterPager.setAdapter(mControlCenterPagerAdapter);
        TabLayout mTabLayout = parent.findViewById(R.id.control_center_tab_layout);
        mTabLayout.setupWithViewPager(mControlCenterPager);
        final boolean dashboardInitialState = preferenceManager.isAttrackEnabled()
                && preferenceManager.getAdBlockEnabled();
        final SwitchCompat ultimateProtectionSwitch = parent.findViewById(R.id.ultimate_protection_switch);
        ultimateProtectionSwitch.setChecked(dashboardInitialState);
        ultimateProtectionSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            mControlCenterPagerAdapter.updateViewComponent(0, isChecked);
            mControlCenterPagerAdapter.updateViewComponent(1, isChecked);
            try {
                adblocker.setEnabled(isChecked);
                antiTracking.setEnabled(isChecked);
                preferenceManager.setAttrackEnabled(isChecked);
                preferenceManager.setAdBlockEnabled(isChecked);
                bus.post(new Messages.onDashboardStateChange());
            } catch (EngineNotYetAvailable engineNotYetAvailable) {
                Log.e("JsEngineError", "Cannot enable/disable tracking modules", engineNotYetAvailable);
            }
        });
    }

    @Override
    public void hideControlCenter() {
        mControlCenterContainer.setVisibility(View.GONE);
    }

    @Override
    public void toggleControlCenter() {
        if (mControlCenterContainer.getVisibility() == View.VISIBLE) {
            mControlCenterContainer.setVisibility(View.GONE);
        } else {
            mControlCenterContainer.setVisibility(View.VISIBLE);
            for(ControlCenterFragment fragment : mControlCenterPagerAdapter.mFragmentList) {
                fragment.updateUI();
            }
        }
    }

    @Override
    public void setControlCenterData(View source, boolean isIncognito, int hashCode, String url) {
        // Do nothing.
    }

    @Subscribe
    public void clearDashboardData(Messages.ClearDashboardData clearDashboardData) {
        insights.clearData();
        for(ControlCenterFragment fragment : mControlCenterPagerAdapter.mFragmentList) {
            fragment.updateUI();
        }
    }
}
