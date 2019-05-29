package com.cliqz.browser.controlcenter;

import android.app.AlertDialog;
import android.content.Context;
import android.text.TextUtils;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.SwitchCompat;
import androidx.fragment.app.FragmentManager;
import androidx.viewpager.widget.ViewPager;

import com.cliqz.browser.R;
import com.google.android.material.snackbar.Snackbar;
import com.google.android.material.tabs.TabLayout;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterHelper implements ControlCenterActions {

    private Context mContext;

    private View mControlCenterContainer;

    private ControlCenterPagerAdapter mControlCenterPagerAdapter;

    private SwitchCompat ultimateProtectionSwitch;

    private String mDomainName = "";

    public ControlCenterHelper(@NonNull FragmentManager fragmentManager,
                               @NonNull Context context, View parent) {
        mContext = context;
        ViewPager mControlCenterPager = parent.findViewById(R.id.control_center_pager);
        mControlCenterContainer = parent.findViewById(R.id.control_center_container);
        mControlCenterPagerAdapter = new ControlCenterPagerAdapter(fragmentManager, context);
        mControlCenterPagerAdapter.init();

        mControlCenterPager.setAdapter(mControlCenterPagerAdapter);
        TabLayout mTabLayout = parent.findViewById(R.id.control_center_tab_layout);
        mTabLayout.setupWithViewPager(mControlCenterPager);

        ultimateProtectionSwitch = parent.findViewById(R.id.ultimate_protection_switch);
        ultimateProtectionSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
            if (!isChecked) {
                new AlertDialog.Builder(mContext)
                        .setTitle(R.string.bond_dashboard_ultimate_protection)
                        .setMessage(
                                mContext.getString(R.string.bond_dashboard_ultimate_protection_pause_dialog,
                                        TextUtils.isEmpty(mDomainName) ? "home" : mDomainName))
                        .setPositiveButton(
                                R.string.bond_dashboard_ultimate_protection_pause_dialog_positive_button,
                                (dialogInterface, i) -> {
                                    toggleUltimateProtection(parent, isChecked);
                                })
                        .setNegativeButton(
                                R.string.bond_dashboard_ultimate_protection_pause_dialog_negative_button,
                                null)
                        .show();
            } else {
                toggleUltimateProtection(parent, isChecked);
            }
        });


    }

    private void toggleUltimateProtection(View parent, boolean changedState) {
        bondDashboardStateChange(changedState);
        if (!changedState) {
            Snackbar.make(parent, R.string.bond_dashboard_protection_off, Snackbar.LENGTH_SHORT).show();
        }
        /*
        final List<String> updatedWhiteList = new ArrayList<>(Arrays.asList(mWhiteList));
        if (changedState) {
            updatedWhiteList.remove(mDomainName);
        } else {
            updatedWhiteList.add(mDomainName);
            SnackbarBuilder.builder(this)
                    .message(R.string.bond_dashboard_protection_off)
                    .duration(Snackbar.LENGTH_SHORT)
                    .buildAndShow();
        }*/
        /*final GeckoBundle geckoBundle = new GeckoBundle();
        geckoBundle.putStringArray("site_whitelist", updatedWhiteList);
        EventDispatcher.getInstance().dispatch("Privacy:SetInfo", geckoBundle);*/
    }

    private void bondDashboardStateChange(boolean isEnabled) {
        mControlCenterPagerAdapter.updateViewComponent(0, isEnabled);
        mControlCenterPagerAdapter.updateViewComponent(1, isEnabled);
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


}
