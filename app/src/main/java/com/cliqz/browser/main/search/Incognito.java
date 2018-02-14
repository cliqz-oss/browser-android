package com.cliqz.browser.main.search;

import android.content.Context;
import android.support.annotation.IntDef;
import android.view.View;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.cliqz.browser.R;

/**
 * @author Khaled Tantawy
 */
public class Incognito extends RelativeLayout {

    public Incognito(Context context) {
        super(context);
        init();
    }

    private void init() {
        inflate(getContext(), R.layout.forget_tab, this);
    }
}
