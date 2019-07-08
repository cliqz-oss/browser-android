package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentManager;
import androidx.viewpager.widget.ViewPager;

import com.cliqz.browser.R;
import com.google.android.material.tabs.TabLayout;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnPageChange;

/**
 * @author Ravjit Uppal
 */
public class StartTabContainer extends FrameLayout {

    @BindView(R.id.view_pager)
    ViewPager mViewPager;

    private final StartTabAdapter mStartTabAdapter;

    public StartTabContainer(@NonNull Context context) {
        this(context, null);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        final LayoutInflater inflater = LayoutInflater.from(context);
        final View view = inflater.inflate(R.layout.starttab_container_layout, this);
        ButterKnife.bind(this, view);
        mStartTabAdapter = new StartTabAdapter(context);
        final IconTabLayout pagerTabStrip = findViewById(R.id.tab_layout);
        mViewPager.setAdapter(mStartTabAdapter);
        pagerTabStrip.setupWithViewPager(mViewPager);
    }

    public void updateFreshTab() {
        mViewPager.setCurrentItem(mViewPager.getCurrentItem());
        mStartTabAdapter.updateView(mViewPager.getCurrentItem());
    }

    public void gotToFavorites() {
        mViewPager.setCurrentItem(2);
    }

    @Override
    public void setVisibility(int visibility) {
        super.setVisibility(visibility);
        if (visibility == VISIBLE) {
            // mStartTabAdapter.updateView(mViewPager.getCurrentItem());
        }
    }

    @OnPageChange(R.id.view_pager)
    void onPageChange(int position) {
        mStartTabAdapter.updateView(position);
    }
}
