package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 *
 * Abstraction layer for Control center adapter for different flavours
 */
public abstract class BaseControlCenterPagerAdapter extends FragmentPagerAdapter {

    private Context mContext;
    final List<ControlCenterFragment> mFragmentList = new ArrayList<>();

    BaseControlCenterPagerAdapter(FragmentManager fm, Context context) {
        super(fm);
        mContext = context;
    }

    public Fragment getItem(int position) {
        return mFragmentList.get(position);
    }

    public int getCount() {
        return mFragmentList.size();
    }

    public CharSequence getPageTitle(int position) {
        return mFragmentList.get(position).getTitle(mContext,position);
    }

    public void setTrackingData(final GeckoBundle message) {
        for(ControlCenterFragment fragment : mFragmentList) {
            fragment.updateUI(message);
        }
    }

    void updateCurrentView(int position) {
        mFragmentList.get(position).refreshUI();
    }

    void updateViewComponent(int position, boolean optionValue) {
        mFragmentList.get(position).refreshUIComponent(optionValue);
    }

}