package com.cliqz.browser.main.search;

import android.content.Context;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.content.ContextCompat;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import com.cliqz.browser.R;

public class Freshtab extends FrameLayout {

    public Freshtab(@NonNull Context context) {
        this(context, null);
    }

    public Freshtab(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public Freshtab(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);

        setBackground(ContextCompat.getDrawable(context, R.drawable.tab_fragment_background));
    }

    public void updateFreshTab() {

    }
}
