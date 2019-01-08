package com.cliqz.browser.main.search;

import android.os.SystemClock;
import android.view.MotionEvent;
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
        AdapterView.OnItemClickListener, View.OnTouchListener {

    private final Freshtab freshtab;
    private float mLastEventRawX;
    private float mLastEventRawY;

    TopsitesEventsListener(Freshtab freshtab) {
        this.freshtab = freshtab;
    }

    @Override
    public boolean onItemLongClick(AdapterView<?> parent, View view, int position, long id) {
        final TopsitesAdapter adapter = TopsitesAdapter.class.cast(parent.getAdapter());
        if (adapter.getItemViewType(position) == TopsitesAdapter.TOPSITE_TYPE) {
            freshtab.removeTopsitesOverlay.start(freshtab.topsitesGridView);
            freshtab.contanier.requestDisallowInterceptTouchEvent(true);
            // Just send an ACTION_DOWN for the picked view, this is part of the workaround to make
            // topsites immediately movable after long pressing them
            final long now = SystemClock.uptimeMillis();
            final MotionEvent event = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN,
                    mLastEventRawX, mLastEventRawY, 0);
            parent.postDelayed(new Runnable() {
                @Override
                public void run() {
                    freshtab.removeTopsitesOverlay.dispatchTouchEvent(event);
                    event.recycle();
                }
            }, 100);
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
                view.getX() + view.getWidth()/2, view.getY() + view.getHeight()/2);
        animation.setDuration(200);
        final Topsite topsite = (Topsite) item;
        freshtab.bus.post(CliqzMessages.OpenLink.open(topsite.url, animation));
        freshtab.telemetry.sendTopsitesClickSignal(position, adapter.getDisplayedCount());
    }

    @Override
    public boolean onTouch(View v, MotionEvent event) {
        // Workaround to make topsites immediately movable after long pressing them
        if (freshtab.removeTopsitesOverlay.isStarted()) {
            freshtab.removeTopsitesOverlay.dispatchTouchEvent(event);
            return true;
        }
        mLastEventRawX = event.getRawX();
        mLastEventRawY = event.getRawY();
        return false;
    }
}
