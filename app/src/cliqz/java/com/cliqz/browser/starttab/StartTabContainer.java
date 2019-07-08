package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

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
        mFreshtab = new Freshtab(context);
        addView(mFreshtab);
    }

    public void updateFreshTab() {
        mFreshtab.updateFreshTab();
    }

    public void gotToFavorites() {
        // NO-OP, stub for supporting the Lumen Flavor
    }
}
