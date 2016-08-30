package com.cliqz.browser.overview;

import android.content.res.Resources;
import android.os.Bundle;
import android.support.annotation.StringRes;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.util.Pair;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.HistoryFragment;

/**
 * Created by Ravjit on 20/07/16.
 */
public class OverviewPagerAdapter extends FragmentPagerAdapter {

    private final TabOverviewFragment tabOverviewFragment;
    private final HistoryFragment historyOverviewFragment;
    private final HistoryFragment favoritesFragment;
    private final FragmentEntry[] fragments;

    private final Resources resources = BrowserApp.getAppContext().getResources();

    private final static class FragmentEntry {
        private final @StringRes int title;
        private final Fragment fragment;

        FragmentEntry(@StringRes int title, Fragment fragment) {
            this.title = title;
            this.fragment = fragment;
        }
    }

    public OverviewPagerAdapter(FragmentManager fragmentManager) {
        super(fragmentManager);
        tabOverviewFragment = new TabOverviewFragment();
        historyOverviewFragment = new HistoryFragment();
        favoritesFragment = new HistoryFragment();
        final Bundle favoritesBundle = new Bundle();
        favoritesBundle.putBoolean(HistoryFragment.SHOW_FAVORITES_ONLY, true);
        favoritesFragment.setArguments(favoritesBundle);
        fragments = new FragmentEntry[] {
                new FragmentEntry(R.string.open_tabs, tabOverviewFragment),
                new FragmentEntry(R.string.history, historyOverviewFragment),
                new FragmentEntry(R.string.favorites, favoritesFragment)
        };
    }

    @Override
    public Fragment getItem(int position) {
        return fragments[position].fragment;
    }

    @Override
    public int getCount() {
        return fragments.length;
    }

    @Override
    public CharSequence getPageTitle(int position) {
        return resources.getString(fragments[position].title);
    }
}
