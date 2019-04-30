package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.os.Bundle;
import android.support.v4.app.FragmentManager;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterPagerAdapter extends BaseControlCenterPagerAdapter {

    static final String IS_TODAY = "is_daily";

    ControlCenterPagerAdapter(FragmentManager fm, Context context) {
        super(fm, context);
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
}