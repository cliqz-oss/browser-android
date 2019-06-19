package com.cliqz.browser.starttab;

import androidx.annotation.DrawableRes;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;

import com.cliqz.browser.starttab.freshtab.FreshTab;

import java.util.ArrayList;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
public class StartTabAdapter extends IconTabLayout.ImageFragmentPagerAdapter {

    private final ArrayList<StartTabFragment> mFragments = new ArrayList<>();

    StartTabAdapter(FragmentManager fm, PreferenceManager preferenceManager) {
        super(fm);
        mFragments.clear();
        boolean isFreshInstall = preferenceManager.getIsFreshInstall();
        if (isFreshInstall) {
            preferenceManager.setIsFreshInstall(false);
        }
        mFragments.add(FreshTab.newInstance(isFreshInstall));
        mFragments.add(new HistoryFragment());
        mFragments.add(new FavoritesFragment());
    }

    @Override
    public StartTabFragment getItem(int i) {
        return mFragments.get(i);
    }

    @Override
    public int getCount() {
        return mFragments.size();
    }

    @Nullable
    @Override
    public CharSequence getPageTitle(int position) {
        return getItem(position).getTitle();
    }

    @DrawableRes
    public int getIcon(int position) {
        return getItem(position).getIconId();
    }

    void updateView(int position) {
        mFragments.get(position).updateView();
    }
}
