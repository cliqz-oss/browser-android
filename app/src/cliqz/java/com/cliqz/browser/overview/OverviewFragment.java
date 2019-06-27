package com.cliqz.browser.overview;

import android.app.Activity;
import android.content.res.Configuration;
import android.content.res.TypedArray;
import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.core.content.ContextCompat;
import androidx.viewpager.widget.ViewPager;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabFragment;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Subscribe;
import com.google.android.material.tabs.TabLayout;
import com.readystatesoftware.systembartint.SystemBarTintManager;

import java.util.Objects;

public class OverviewFragment extends CommonOverviewFragment {

    private ViewPager mViewPager;
    private OverviewTabsEnum mSelectedTab = OverviewTabsEnum.UNDEFINED;
    private OverviewPagerAdapter mPageAdapter;
    private OnPageChangeListener mOnPageChangeListener;
    public View contextualToolBar;
    private int mCurrentPageIndex = -1;

    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, final ViewGroup container,
                             Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.activity_overview, container, false);
        contextualToolBar = view.findViewById(R.id.history_contextual_menu);
        final View cancelButton = view.findViewById(R.id.action_cancel);
        cancelButton.setOnClickListener(v -> bus.post(new Messages.OnContextualBarCancelPressed()));
        final View deleteButton = view.findViewById(R.id.action_delete);
        deleteButton.setOnClickListener(v -> bus.post(new Messages.OnContextualBarDeletePressed()));
        final int themeResId = R.style.Theme_Cliqz_Overview;
        final Activity activity = Objects.requireNonNull(getActivity());
        final TypedArray typedArray = activity.getTheme()
                .obtainStyledAttributes(themeResId, new int[]{R.attr.colorPrimaryDark});
        final int resourceId = typedArray.getResourceId(0, R.color.normal_tab_primary_color);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            activity.getWindow()
                    .setStatusBarColor(ContextCompat.getColor(activity, resourceId));
            typedArray.recycle();
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            SystemBarTintManager tintManager = new SystemBarTintManager(activity);
            tintManager.setStatusBarTintEnabled(true);
            tintManager.setNavigationBarTintEnabled(true);
            tintManager.setTintColor(resourceId);
        }

        mPageAdapter = new OverviewPagerAdapter(getChildFragmentManager());
        mViewPager = view.findViewById(R.id.viewpager);
        mViewPager.setOffscreenPageLimit(5);
        mViewPager.setAdapter(mPageAdapter);
        final Toolbar toolbar = view.findViewById(R.id.toolbar);
        toolbar.setTitle(activity.getString(R.string.overview));
        ((AppCompatActivity) activity).setSupportActionBar(toolbar);
        final ActionBar actionBar = ((AppCompatActivity) activity).getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setTitle(activity.getString(R.string.overview));
        }
        TabLayout tabLayout = view.findViewById(R.id.tabs);
        tabLayout.setupWithViewPager(mViewPager);
        return view;
    }

    private void sendCurrentPageHideSignal() {
        if (telemetry != null && mCurrentPageIndex != -1) {
            final String previousName = resolvePageName(mCurrentPageIndex);
            final long now = System.currentTimeMillis();
            final long duration =
                    now - mPageAdapter.getLastShownTime(mCurrentPageIndex);
            telemetry.sendOverviewPageVisibilitySignal(previousName, duration, false);
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        sendCurrentPageHideSignal();
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
    }

    @Subscribe
    public void openLink(CliqzMessages.OpenLink event) {
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
        final TabFragment tab = tabsManager.getCurrentTab();
        if (tab != null) {
            if (tab.isResumed()) {
                tab.openLink(event.url, false, true, null);
            } else {
                tab.openFromOverview(event);
            }
        }
    }

    @Subscribe
    public void openQuery(Messages.OpenQuery event) {
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
        final TabFragment tab = tabsManager.getCurrentTab();
        if (tab != null) {
            tab.searchQuery(event.query);
        }
    }

    @Subscribe
    public void onOrientationChanged(Configuration newConfig) {
        telemetry.sendOrientationSignal(newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE ?
        TelemetryKeys.LANDSCAPE : TelemetryKeys.PORTRAIT, TelemetryKeys.OVERVIEW);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (bus != null) {
            bus.unregister(this);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        final OverviewTabsEnum selected = mSelectedTab != OverviewTabsEnum.UNDEFINED ?
                mSelectedTab : OverviewTabsEnum.TABS;
        final int position = selected.getFragmentIndex();
        mCurrentPageIndex = position;
        mViewPager.setCurrentItem(position);
        mPageAdapter.setShownTime(position);
        if (telemetry != null) {
            telemetry.sendOverviewPageVisibilitySignal(resolvePageName(position), 0, true);
        }
        mSelectedTab = OverviewTabsEnum.UNDEFINED;
        mOnPageChangeListener = new OnPageChangeListener();
        mViewPager.addOnPageChangeListener(mOnPageChangeListener);
    }

    @Override
    public void onPause() {
        mViewPager.removeOnPageChangeListener(mOnPageChangeListener);
        super.onPause();
    }

    public void setDisplayFavorites() {
        mSelectedTab = OverviewTabsEnum.FAVORITES;
    }

    public void setDisplayHistory() {
        mSelectedTab = OverviewTabsEnum.HISTORY;
    }

    public void setDisplayOffrz() {
        mSelectedTab = OverviewTabsEnum.OFFRZ;
    }

    private String resolvePageName(int position) {
        if (position == OverviewTabsEnum.TABS.getFragmentIndex()) {
            return TelemetryKeys.OPEN_TABS;
        } else if (position == OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            return  TelemetryKeys.HISTORY;
        } else if (position == OverviewTabsEnum.OFFRZ.getFragmentIndex()) {
            return TelemetryKeys.OFFRZ;
        } else {
            return TelemetryKeys.FAVORITES;
        }
    }

    public int getCurrentPageIndex() {
        return mCurrentPageIndex;
    }

    private final class OnPageChangeListener implements ViewPager.OnPageChangeListener {

        @Override
        public void onPageScrolled(int position, float positionOffset,
        int positionOffsetPixels) {
        }

        @Override
        public void onPageSelected(int position) {
            if (telemetry != null) {
                // Apparently it happens that telemetry here is null
                final String nextPage = resolvePageName(position);
                telemetry.sendOverviewPageChangedSignal(nextPage);
                telemetry.sendOverviewPageVisibilitySignal(nextPage, 0L, true);
                sendCurrentPageHideSignal();
            }
            bus.post(new Messages.OnOverviewTabSwitched(position));
            mCurrentPageIndex = position;
        }

        @Override
        public void onPageScrollStateChanged(int state) {

        }
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        sendCurrentPageHideSignal();
        return super.onOptionsItemSelected(item);
    }
}
