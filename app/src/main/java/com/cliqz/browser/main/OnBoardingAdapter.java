package com.cliqz.browser.main;

import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentPagerAdapter;
import android.support.v4.view.ViewPager;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.Telemetry;

/**
 * Created by Ravjit on 25/01/16.
 */
public class OnBoardingAdapter extends FragmentPagerAdapter {

    public static class FirstFragment extends OnBoardingFragment {
        @Override
        protected int getLayout() {
            return R.layout.on_boarding_first;
        }
    }

    public static class SecondFragment extends OnBoardingFragment {
        @Override
        protected int getLayout() {
            return R.layout.on_boarding_second;
        }
    }

    private final OnBoardingFragment[] onBoardingFragments = new OnBoardingFragment[] {
            new FirstFragment(),
            new SecondFragment()
    };

    // private ArrayList<Fragment> onBoardingFragments = new ArrayList<>(onBoardingLayouts.length);
    private Telemetry telemetry;
    public long startTime;

    public OnBoardingAdapter(FragmentManager fragmentManager, Telemetry telemetry) {
        super(fragmentManager);
        this.telemetry = telemetry;
        startTime = System.currentTimeMillis();
        telemetry.sendOnBoardingShowSignal(0);
    }

    @Override
    public int getCount() {
        return onBoardingFragments.length;
    }

    @Override
    public Fragment getItem(int pos) {
        return onBoardingFragments[pos];
    }

    ViewPager.OnPageChangeListener onPageChangeListener = new ViewPager.OnPageChangeListener() {
        @Override
        public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {
        }

        @Override
        public void onPageSelected(int position) {
            long curTime = System.currentTimeMillis();
            telemetry.sendOnBoardingHideSignal(curTime-startTime);
            startTime = curTime;
            telemetry.sendOnBoardingShowSignal(position);
        }

        @Override
        public void onPageScrollStateChanged(int state) {

        }
    };
}
