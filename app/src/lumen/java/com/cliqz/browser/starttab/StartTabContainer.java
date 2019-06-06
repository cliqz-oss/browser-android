package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;
import androidx.viewpager.widget.ViewPager;

import com.cliqz.browser.R;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
public class StartTabContainer extends FrameLayout {

    public StartTabContainer(@NonNull Context context) {
        this(context, null);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        final LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
        final View view = inflater.inflate(R.layout.starttab_container_layout, null);
        addView(view);
    }

    public void updateFreshTab() {
    }

    public void init(FragmentManager supportFragmentManager, PreferenceManager preferenceManager) {
        final ViewPager viewPager = findViewById(R.id.view_pager);
        final StartTabAdapter startTabAdapter = new StartTabAdapter(supportFragmentManager, preferenceManager);
        final IconTabLayout pagerTabStrip = findViewById(R.id.tab_layout);
        viewPager.setAdapter(startTabAdapter);
        pagerTabStrip.setupWithViewPager(viewPager);
    }
}
