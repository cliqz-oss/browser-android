package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.os.Bundle;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;

import com.cliqz.browser.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterPagerAdapter extends FragmentPagerAdapter {

    static final String IS_TODAY = "is_daily";

    private final Context mContext;

    final List<DashboardFragment> mFragmentList = new ArrayList<>();

    ControlCenterPagerAdapter(FragmentManager fm, Context context) {
        super(fm);
        this.mContext = context;
    }

    @Override
    public Fragment getItem(int position) {
        return mFragmentList.get(position);
    }

    public void init() {
        final DashboardFragment dashboardTodayFragment = new DashboardFragment();
        final DashboardFragment dashboardWeekFragment = new DashboardFragment();
        final Bundle todayFragmentArguments = new Bundle();
        final Bundle weekFragmentArguments = new Bundle();
        todayFragmentArguments.putBoolean(IS_TODAY, true);
        weekFragmentArguments.putBoolean(IS_TODAY, false);
        dashboardTodayFragment.setArguments(todayFragmentArguments);
        dashboardWeekFragment.setArguments(weekFragmentArguments);
        mFragmentList.add(dashboardTodayFragment);
        mFragmentList.add(dashboardWeekFragment);
    }

    @Override
    public int getCount() {
        return mFragmentList.size();
    }

    @Nullable
    @Override
    public CharSequence getPageTitle(int position) {
        if (position == 0) {
            return mContext.getString(R.string.bond_dashboard_today_title);
        } else {
            return mContext.getString(R.string.bond_dashboard_week_title);
        }
    }

    void updateViewComponent(int position, boolean optionValue) {
        mFragmentList.get(position).refreshUIComponent(optionValue);
    }
}