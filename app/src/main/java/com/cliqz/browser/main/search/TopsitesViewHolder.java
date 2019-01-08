package com.cliqz.browser.main.search;

import android.view.View;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.Topsite;

/**
 * @author Stefano Pacifici
 */
class TopsitesViewHolder extends IconViewHolder {
    private volatile Topsite mTopsite;
    final TextView domainView;
    private final int draggedPosition;
    private int positionAtParent;

    TopsitesViewHolder(View convertView,int draggedPosition) {
        super(convertView);
        domainView = (TextView) convertView.findViewById(R.id.domain_view);
        this.draggedPosition = draggedPosition;
    }

    synchronized void setTopsite(Topsite topsite) {
        mTopsite = topsite;
    }

    synchronized String getUrl() {
        return mTopsite.url;
    }

    public Topsite getTopsite() {
        return mTopsite;
    }

    public int getPositionAtParent() {
        return positionAtParent;
    }

    public void setPositionAtParent(int positionAtParent) {
        this.positionAtParent = positionAtParent;
    }

    public int getDraggedPosition() {
        return draggedPosition;
    }
}
