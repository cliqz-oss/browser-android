package com.cliqz.browser.main.search;

import android.content.Context;
import android.os.Handler;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.Topsite;
import com.cliqz.jsengine.Engine;

import java.util.List;

import acr.browser.lightning.database.HistoryDatabase;

/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class TopsitesAdapter extends BaseAdapter {
    static final int TOPSITE_TYPE = 0;
    // Weaker access to keep consistency with TOPSITE_TYPE
    @SuppressWarnings("WeakerAccess")
    static final int PLACEHOLDER_TYPE = 1;

    private final HistoryDatabase historyDatabase;

    private static final int TOPSITE_LIMIT = 15;
    private static final int TOPSITES_COUNT = 4;

    private List<Topsite> topsites;
    private final Engine engine;
    private final Handler handler;

    // private final Context context;

    TopsitesAdapter(HistoryDatabase database, Engine engine, Handler handler) {
        this.historyDatabase = database;
        this.engine = engine;
        this.handler = handler;
    }

    void fetchTopsites() {
        topsites = historyDatabase.getTopSites(TOPSITE_LIMIT);
        notifyDataSetInvalidated();
    }

    public int getCount() {
        return TOPSITES_COUNT;
    }

    @Override
    public int getViewTypeCount() {
        // Regular topsites and placeholders
        return 2;
    }

    @Override
    public int getItemViewType(int position) {
        return position < topsites.size() ? TOPSITE_TYPE : PLACEHOLDER_TYPE;
    }

    int getDisplayedCount() { return Math.min(TOPSITES_COUNT, topsites.size()); }

    @Override
    public Object getItem(int position) {
        if (position >= topsites.size() || position >= TOPSITES_COUNT) {
            return null;
        }
        return topsites.get(position);
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    // create a new ImageView for each item referenced by the Adapter
    public View getView(final int position, View convertView, ViewGroup parent) {

        final TopsitesViewHolder row;
        final Context context = parent.getContext();
        final LayoutInflater inflater = LayoutInflater.from(context);

        switch (getItemViewType(position)) {
            case TOPSITE_TYPE:
                if (convertView == null) {
                    // if it's not recycled, initialize some attributes
                    convertView = inflater.inflate(R.layout.topsites_layout, parent, false);
                    row = new TopsitesViewHolder(convertView);
                    convertView.setTag(row);
                } else {
                    row = (TopsitesViewHolder) convertView.getTag();
                }
                final Topsite topsite = topsites.get(position);
                row.setTopsite(topsite);
                row.domainView.setText(topsite.domain);

                loadIcon(row, topsite.url);
                break;
            default:
                convertView = convertView == null ?
                        new TopsitePlaceHolderView(context) : convertView;
                break;
        }

        return convertView;
    }

    private void loadIcon(final TopsitesViewHolder holder, String url) {
        engine.callAction("getLogoDetails", new FreshtabGetLogoCallback(holder, handler), url);
    }
}
