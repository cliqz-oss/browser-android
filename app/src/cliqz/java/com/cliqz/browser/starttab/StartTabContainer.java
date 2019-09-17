package com.cliqz.browser.starttab;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.search.Freshtab;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

/**
 * @author Ravjit Uppal
 */
public class StartTabContainer extends FrameLayout {

    @Inject
    Bus bus;

    private Freshtab mFreshtab;

    public StartTabContainer(@NonNull Context context) {
        this(context, null);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public StartTabContainer(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        mFreshtab = new Freshtab(context);
        addView(mFreshtab);
    }

    @Override
    protected void onVisibilityChanged(@NonNull View changedView, int visibility) {
        super.onVisibilityChanged(changedView, visibility);
        if (visibility == VISIBLE) {
            bus.post(new Messages.DisableScrolling());
        } else {
            bus.post(new Messages.EnableScrolling());
        }
    }

    public void updateFreshTab(boolean isIncognito) {
        mFreshtab.updateFreshTab(isIncognito);
        bus.post(new Messages.DisableScrolling());
    }

    public void gotToFavorites() {
        // NO-OP, stub for supporting the Lumen Flavor
    }
}
