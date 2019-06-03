package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.util.AttributeSet;

import androidx.viewpager.widget.ViewPager;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterViewPager extends ViewPager {

    public ControlCenterViewPager(Context context) {
        this(context, null);
    }

    public ControlCenterViewPager(Context context, AttributeSet attrs) {
        super(context, attrs);
        addOnPageChangeListener(new ViewPager.OnPageChangeListener() {
            @Override
            public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {
                // Do nothing
            }

            @Override
            public void onPageSelected(int position) {
                if (getAdapter() != null) {
                    ((ControlCenterPagerAdapter) getAdapter()).updateCurrentView(position);
                }
            }

            @Override
            public void onPageScrollStateChanged(int state) {
                // Do nothing
            }
        });
    }
}
