package com.cliqz.browser.starttab;

import androidx.annotation.DrawableRes;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;

import java.util.ArrayList;

/**
 * @author Ravjit Uppal
 */
public class StartTabAdapter extends IconTabLayout.ImageFragmentPagerAdapter {

    final ArrayList<StartTabFragment> mFragments = new ArrayList<>();

    public StartTabAdapter(FragmentManager fm) {
        super(fm);
        mFragments.clear();
        mFragments.add(new Freshtab());
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
}
