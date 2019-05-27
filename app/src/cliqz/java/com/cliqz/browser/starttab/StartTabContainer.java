package com.cliqz.browser.starttab;

import android.content.Context;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.FragmentManager;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import com.cliqz.browser.main.search.Freshtab;

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

    public void init(FragmentManager supportFragmentManager) {
        mFreshtab = new Freshtab(getContext());
        addView(mFreshtab);
    }

    public void updateFreshTab() {
        mFreshtab.updateFreshTab();
    }
}
