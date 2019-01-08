package com.cliqz.browser.main.search;

import android.content.Context;
import android.widget.RelativeLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

/**
 * @author Khaled Tantawy
 */
public class Incognito extends RelativeLayout {

    @Inject
    Bus bus;

    public Incognito(Context context) {
        super(context);
        init();
        final MainActivityComponent component = BrowserApp.getActivityComponent(getContext());
        if (component != null) {
            component.inject(this);
        }
    }

    private void init() {
        inflate(getContext(), R.layout.forget_tab, this);
    }

    @Override
    public void setVisibility(int visibility) {
        super.setVisibility(visibility);
        if (visibility == VISIBLE) {
            if (bus != null) {
                bus.post(new Messages.OnFreshTabVisible());
            }
        }
    }
}
