package com.cliqz.browser.controlcenter;

import android.support.annotation.StringRes;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

/**
 * Created by Ravjit on 15/11/16.
 */

public class ControlCenterAdapter extends FragmentPagerAdapter {

    private final FragmentEntry[] fragments;

    private static class FragmentEntry {
        private final @StringRes int title;
        private final Fragment fragment;

        FragmentEntry(@StringRes int title, Fragment fragment) {
            this.title = title;
            this.fragment = fragment;
        }
    }

    public ControlCenterAdapter(FragmentManager fragmentManager, boolean isIncognito, int hashCode, String url) {
        super(fragmentManager);
        fragments = new FragmentEntry[] {
                new FragmentEntry(R.string.control_center_header_antitracking, AntiTrackingFragment.create(hashCode, url, isIncognito)),
                new FragmentEntry(R.string.control_center_header_adblocking, AdBlockingFragment.create(url, isIncognito)),
                new FragmentEntry(R.string.control_center_header_antiphishing, AntiPhishingFragment.create(isIncognito))
        };
    }

    @Override
    public int getCount() {
        return fragments.length;
    }

    @Override
    public Fragment getItem(int position) {
        return fragments[position].fragment;
    }

    @Override
    public CharSequence getPageTitle(int position) {
        return BrowserApp.getAppContext().getResources().getString(fragments[position].title);
    }

}
