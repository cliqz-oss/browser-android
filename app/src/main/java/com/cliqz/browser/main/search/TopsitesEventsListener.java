package com.cliqz.browser.main.search;

import android.view.View;
import android.widget.AdapterView;

import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.Topsite;

/**
 * Handle events for the Freshtab top sites
 *
 * @author Stefano Pacifici
 */
class TopsitesEventsListener implements AdapterView.OnItemLongClickListener, AdapterView.OnItemClickListener {

    private final Freshtab freshtab;

    TopsitesEventsListener(Freshtab freshtab) {
        this.freshtab = freshtab;
    }

    @Override
    public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
        final TopsitesAdapter adapter = TopsitesAdapter.class.cast(parent.getAdapter());
        if (adapter.getItemViewType(position) == TopsitesAdapter.TOPSITE_TYPE) {
            freshtab.overlay.start(freshtab.topsitesGridView);
        }
        return true;
    }

    @Override
    public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
        TopsitesAdapter adapter = (TopsitesAdapter) parent.getAdapter();
        Object item = adapter.getItem(position);
        if (item == null) {
            return;
        }
        Topsite topsite = (Topsite) item;
        freshtab.bus.post(new CliqzMessages.OpenLink(topsite.url));
        freshtab.telemetry.sendTopsitesClickSignal(position, adapter.getDisplayedCount());
    }
}
