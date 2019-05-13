package com.cliqz.browser.starttab;

import android.content.Context;
import android.support.annotation.Nullable;
import android.support.design.widget.TabLayout;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.support.v4.view.ViewPager;
import android.util.AttributeSet;

/**
 * @author Ravjit Uppal
 *
 * This is a custom TabLayout class which shows icons instead of text in the tabs.
 * The viewpager's adapter should extend ImageFragementPagerAdapter instead of FragmentPagerAdpater
 */
public class IconTabLayout extends TabLayout {

    abstract static class ImageFragmentPagerAdapter extends FragmentPagerAdapter {

        public ImageFragmentPagerAdapter(FragmentManager fm) {
            super(fm);
        }

        public abstract int getIcon(int position);
    }

    public IconTabLayout(Context context) {
        super(context);
    }

    public IconTabLayout(Context context, AttributeSet attrs) {
        super(context, attrs);
    }

    public IconTabLayout(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    public void setupWithViewPager(@Nullable ViewPager viewPager) {
        super.setupWithViewPager(viewPager);
        for (int i = 0; i < getTabCount(); i++) {
            getTabAt(i).setText("");
            getTabAt(i).setIcon(((ImageFragmentPagerAdapter)viewPager.getAdapter()).getIcon(i));
        }
    }
}
