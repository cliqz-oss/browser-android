package com.cliqz.browser.overview;

import android.support.annotation.ColorInt;
import android.view.View;
import android.widget.ImageView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.search.IconViewHolder;

/**
 * @author Ravjit Uppal
 */
public class TabIconHolder extends IconViewHolder {
    volatile String url;
    private final View backgroundView;
    public View iconBackGround;
    public ImageView iconView;
    public String iconUrl;

    TabIconHolder(View convertView) {
        super(convertView);
        backgroundView = convertView.findViewById(R.id.icon_background);
    }

    @Override
    public void setBackgroundColor(@ColorInt int color) {
        backgroundView.setBackgroundColor(color);
    }
}
