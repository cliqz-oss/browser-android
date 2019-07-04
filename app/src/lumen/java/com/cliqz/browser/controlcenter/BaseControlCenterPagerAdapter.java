package com.cliqz.browser.controlcenter;

import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 *
 * Abstraction layer for Control center adapter for different flavours
 */
public abstract class BaseControlCenterPagerAdapter extends FragmentPagerAdapter {

    final List<DashboardFragment> mFragmentList = new ArrayList<>();

    BaseControlCenterPagerAdapter(FragmentManager fm) {
        super(fm);
    }

    @Override
    public Fragment getItem(int position) {
        return mFragmentList.get(position);
    }

    public int getCount() {
        return mFragmentList.size();
    }

    public CharSequence getPageTitle(int position) {
        return mFragmentList.get(position).getTitle();
    }

    void updateViewComponent(int position, boolean optionValue) {
        mFragmentList.get(position).refreshUIComponent(optionValue);
    }

}