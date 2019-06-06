package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;

import com.cliqz.browser.main.search.Freshtab;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
public class StartTabContainer extends FrameLayout {

    private Freshtab mFreshtab;

    public StartTabContainer(@NonNull Context context) {
        this(context, null);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public void init(FragmentManager supportFragmentManager, PreferenceManager preferenceManager) {
        mFreshtab = new Freshtab(getContext());
        addView(mFreshtab);
    }

    public void updateFreshTab() {
        mFreshtab.updateFreshTab();
    }
}
