package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;

import androidx.annotation.DrawableRes;
import androidx.annotation.Nullable;
import androidx.viewpager.widget.PagerAdapter;
import androidx.viewpager.widget.ViewPager;

import com.google.android.material.tabs.TabLayout;

import java.util.Objects;

/**
 * @author Ravjit Uppal
 *
 * This is a custom TabLayout class which shows icons instead of text in the tabs.
 * The viewpager's adapter should extend ImageFragementPagerAdapter instead of FragmentPagerAdpater
 */
public class IconTabLayout extends TabLayout {

    abstract static class ImagePagerAdapter extends PagerAdapter {

        @SuppressWarnings("WeakerAccess")
        @DrawableRes
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
        final ImagePagerAdapter adapter =
                viewPager != null ? (ImagePagerAdapter) viewPager.getAdapter() : null;
        if (adapter == null) {
            return;
        }
        for (int i = 0; i < getTabCount(); i++) {
            final TabLayout.Tab tab = Objects.requireNonNull(getTabAt(i));
            tab.setText("");
            tab.setIcon(adapter.getIcon(i));
        }
    }
}
