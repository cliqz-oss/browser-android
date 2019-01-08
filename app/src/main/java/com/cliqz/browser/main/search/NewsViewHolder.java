package com.cliqz.browser.main.search;

import android.view.View;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;

/**
 * @author Stefano Pacifici
 */
class NewsViewHolder extends IconViewHolder implements View.OnClickListener {
    final TextView urlView;
    final TextView titleView;
    private final Topnews piece;
    private final Telemetry telemetry;
    private final Bus bus;
    private final int position;
    private volatile String mUrl;

    NewsViewHolder(View view, int position, Topnews piece, Telemetry telemetry, Bus bus) {
        super(view);
        view.setOnClickListener(this);
        this.position = position;
        this.urlView = view.findViewById(R.id.url_view);
        this.titleView = view.findViewById(R.id.title_view);
        this.piece = piece;
        this.telemetry = telemetry;
        this.bus = bus;
    }

    synchronized void setUrl(String url) {
        mUrl = url;
    }

    synchronized String getUrl() {
        return mUrl;
    }

    @Override
    public void onClick(View view) {
        String target = TelemetryKeys.TOPNEWS;
        if (piece.isLocalNews) {
            target = TelemetryKeys.LOCALNEWS;
        } else if (piece.breaking) {
            target = TelemetryKeys.BREAKINGNEWS;
        }
        bus.post(CliqzMessages.OpenLink.open(piece.url));
        telemetry.sendTopnewsClickSignal(position, target);
    }
}
