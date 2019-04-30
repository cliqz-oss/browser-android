package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.support.v4.view.ViewPager;
import android.util.AttributeSet;

import com.cliqz.browser.controlcenter.ControlCenterPagerAdapter;

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
