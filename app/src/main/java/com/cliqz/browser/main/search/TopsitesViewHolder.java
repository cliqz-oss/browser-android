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

    TopsitesViewHolder(View convertView) {
        super(convertView);
        domainView = (TextView) convertView.findViewById(R.id.domain_view);
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
}
