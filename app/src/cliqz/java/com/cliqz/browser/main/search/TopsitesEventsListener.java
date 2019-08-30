package com.cliqz.browser.main.search;

import android.view.View;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.widget.AdapterView;

import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.Topsite;

/**
 * Handle events for the Freshtab top sites
 *
 * @author Stefano Pacifici
 */
class TopsitesEventsListener implements AdapterView.OnItemLongClickListener,
        AdapterView.OnItemClickListener {

    private final Freshtab freshtab;

    TopsitesEventsListener(Freshtab freshtab) {
        this.freshtab = freshtab;
    }

    @Override
    public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
        final TopsitesAdapter adapter = TopsitesAdapter.class.cast(parent.getAdapter());
        if (adapter.getItemViewType(position) == TopsitesAdapter.TOPSITE_TYPE) {
            final Topsite topsite = (Topsite) adapter.getItem(position);
            TopSitesContextMenu.showMenu(view, freshtab, topsite);
        }
        return true;
    }

    @Override
    public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
        final TopsitesAdapter adapter = (TopsitesAdapter) parent.getAdapter();
        final Object item = adapter.getItem(position);
        if (item == null) {
            return;
        }
        final Animation animation = new ScaleAnimation(0.0f, 1.0f, 0.0f, 1.0f,
                view.getX() + view.getWidth() / 2f, view.getY() + view.getHeight() / 2f);
        animation.setDuration(200);
        final Topsite topsite = (Topsite) item;
        freshtab.bus.post(CliqzMessages.OpenLink.open(topsite.url, animation));
        freshtab.telemetry.sendTopsitesClickSignal(position, adapter.getDisplayedCount());
    }

}
