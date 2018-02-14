package com.cliqz.browser.controlcenter;

import android.os.Bundle;
import android.support.annotation.StringRes;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

import static com.cliqz.browser.controlcenter.ControlCenterFragment.KEY_HASHCODE;
import static com.cliqz.browser.controlcenter.ControlCenterFragment.KEY_IS_INCOGNITO;
import static com.cliqz.browser.controlcenter.ControlCenterFragment.KEY_URL;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */

class ControlCenterAdapter extends FragmentPagerAdapter {

    private final FragmentEntry[] fragments;

    private static class FragmentEntry {
        private final @StringRes int title;
        private final Fragment fragment;

        FragmentEntry(@StringRes int title, Fragment fragment) {
            this.title = title;
            this.fragment = fragment;
        }
    }

    ControlCenterAdapter(FragmentManager fragmentManager, boolean isIncognito, int hashCode, String url) {
        super(fragmentManager);
        final ControlCenterTabs[] values = ControlCenterTabs.values();
        fragments = new FragmentEntry[values.length];
        try {
            for (int i = 0; i < values.length; i++) {
                final ControlCenterFragment fragment = values[i].fragmentClass.newInstance();
                final Bundle args = new Bundle();
                args.putInt(KEY_HASHCODE, hashCode);
                args.putString(KEY_URL, url);
                args.putBoolean(KEY_IS_INCOGNITO, isIncognito);
                fragment.setArguments(args);
                fragments[i] = new FragmentEntry(values[i].title, fragment);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
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
