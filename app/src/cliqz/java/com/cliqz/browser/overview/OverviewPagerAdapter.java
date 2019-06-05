package com.cliqz.browser.overview;

import android.content.res.Resources;
import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;
import android.util.SparseArray;

import com.cliqz.browser.app.BrowserApp;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
class OverviewPagerAdapter extends FragmentPagerAdapter {

    private final SparseArray<FragmentEntry> fragments;

    private final Resources resources = BrowserApp.getAppContext().getResources();

    private final static class FragmentEntry {
        private final @StringRes int title;
        private final Fragment fragment;
        private long mLastShowTime = 0L;

        FragmentEntry(@StringRes int title, Fragment fragment) {
            this.title = title;
            this.fragment = fragment;
        }
    }

    OverviewPagerAdapter(FragmentManager fragmentManager) {
        super(fragmentManager);
        fragments = new SparseArray<>();
        for (OverviewTabsEnum entry: OverviewTabsEnum.values()) {
            if (entry != OverviewTabsEnum.UNDEFINED && entry.getFragmentIndex() >= 0) {
                final int index = entry.getFragmentIndex();
                final Fragment fragment = entry.newFragmentInstance();
                final FragmentEntry fragEntry = new FragmentEntry(entry.title, fragment);
                fragments.put(index, fragEntry);
            }
        }
    }

    @Override
    public Fragment getItem(int position) {
        return fragments.get(position).fragment;
    }

    @Override
    public int getCount() {
        return fragments.size();
    }

    @Override
    public CharSequence getPageTitle(int position) {
        return resources.getString(fragments.get(position).title);
    }

    long getLastShownTime(int position) {
        return fragments.get(position).mLastShowTime;
    }

    void setShownTime(int position) {
        fragments.get(position).mLastShowTime = System.currentTimeMillis();
    }
}
