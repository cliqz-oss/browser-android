package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;

import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;
import androidx.viewpager.widget.ViewPager;

import com.google.android.material.tabs.TabLayout;

/**
 * @author Ravjit Uppal
 *
 * This is a custom TabLayout class which shows icons instead of text in the tabs.
 * The viewpager's adapter should extend ImageFragementPagerAdapter instead of FragmentPagerAdpater
 */
public class IconTabLayout extends TabLayout {

    abstract static class ImageFragmentPagerAdapter extends FragmentPagerAdapter {

        ImageFragmentPagerAdapter(FragmentManager fm) {
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
