package com.cliqz.browser.main.search;

import android.content.Context;
import android.os.Handler;
import androidx.core.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.BaseAdapter;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.webview.Topsite;
import com.cliqz.jsengine.Engine;

import java.util.Collections;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class TopsitesAdapter extends BaseAdapter {


    @SuppressWarnings("WeakerAccess")
    public static final int TOPSITE_TYPE = 0;

    @SuppressWarnings("WeakerAccess")
    public static final int PLACEHOLDER_TYPE = 1;

    private final HistoryDatabase historyDatabase;

    private static final int TOPSITE_LIMIT = 15;

    private List<Topsite> topsites = Collections.emptyList();
    private final Engine engine;
    private final Handler handler;
    private final PreferenceManager preferenceManager;

    // private final Context context;

    @Inject
    TopsitesAdapter(HistoryDatabase database, Engine engine, MainActivityHandler handler,
                    PreferenceManager preferenceManager) {
        this.historyDatabase = database;
        this.engine = engine;
        this.handler = handler;
        this.preferenceManager = preferenceManager;
    }

    // Weaker access due to Lumen
    @SuppressWarnings("WeakerAccess")
    public void fetchTopsites() {
        topsites = historyDatabase.getTopSites(TOPSITE_LIMIT);
        notifyDataSetInvalidated();
    }

    public int getCount() {
        //noinspection ConstantConditions
        if (BuildConfig.FLAVOR_LUMEN.equals(BuildConfig.FLAVOR)) {
            return topsites.size() > 0 ? BuildConfig.VISIBLE_TOP_SITES : 0;
        } else {
            return BuildConfig.VISIBLE_TOP_SITES;
        }
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

    // Weaker access due to Lumen
    @SuppressWarnings("WeakerAccess")
    public int getDisplayedCount() { return Math.min(BuildConfig.VISIBLE_TOP_SITES, topsites.size()); }

    @Override
    public Object getItem(int position) {
        if (position >= topsites.size() || position >= BuildConfig.VISIBLE_TOP_SITES) {
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

        if (getItemViewType(position) == TOPSITE_TYPE) {
            if (convertView == null) {
                // if it's not recycled, initialize some attributes
                convertView = inflater.inflate(R.layout.topsites_layout, parent, false);
                row = new TopsitesViewHolder(convertView, position);
                convertView.setTag(row);
            } else {
                row = (TopsitesViewHolder) convertView.getTag();
            }
            final Topsite topsite = topsites.get(position);
            row.setTopsite(topsite);
            row.domainView.setText(topsite.domain);
            row.domainView.setTextColor(ContextCompat.getColor(context,
                    preferenceManager.isBackgroundImageEnabled() ?
                            R.color.white : R.color.black));

            loadIcon(row, topsite.url);
        } else {
            convertView = convertView == null ?
                    inflater.inflate(R.layout.topsites_placeholder_layout, parent, false) :
                    convertView;
        }

        return convertView;
    }

    private void loadIcon(final TopsitesViewHolder holder, String url) {
        engine.callAction("getLogoDetails", new FreshtabGetLogoCallback(holder, handler, true), url);
    }
}
