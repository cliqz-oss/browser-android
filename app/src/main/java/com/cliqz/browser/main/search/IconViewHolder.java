package com.cliqz.browser.main.search;

import android.support.annotation.ColorInt;
import android.support.v7.widget.RecyclerView;
import android.view.View;

import com.cliqz.browser.R;
import com.facebook.drawee.view.SimpleDraweeView;

/**
 * @author Khaled Tantawy
 * @author Ravjit Singh
 */
public class IconViewHolder extends RecyclerView.ViewHolder{
    final SimpleDraweeView iconView;

    public IconViewHolder(View itemView) {
        super(itemView);
        iconView = (SimpleDraweeView) itemView.findViewById(R.id.icon_view);

    }

    public void setBackgroundColor(@ColorInt int color) {
        iconView.setBackgroundColor(color);
    }
}
