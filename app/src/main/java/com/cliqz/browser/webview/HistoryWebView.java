package com.cliqz.browser.webview;

import android.content.Context;
import android.support.annotation.Nullable;

import com.cliqz.browser.BuildConfig;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 * @date 2015/12/08
 */
public class HistoryWebView extends BaseWebView {

    private static final String FRESHTAB_URL = "file:///android_asset/search/history.html";
    private static final String FRESHTAB_MANIFEST_URL = "file:///android_asset/search/history.json";

    public HistoryWebView(Context context) {
        super(context);
        bridge.setWebView(this);
    }

    @Nullable
    @Override
    protected AWVClient createClient() {
        return new SslWorkAroundClient();
    }

    @Nullable
    @Override
    protected String getExtensionUrl() {
        if ("xwalk".equals(BuildConfig.FLAVOR_api)) {
            return FRESHTAB_MANIFEST_URL;
        } else {
            return FRESHTAB_URL;
        }
    }

    public void fourceUpdateHistory() {
        executeJS("osAPI.searchHistory(\"\", \"History.showHistory\")");
    }

    /**
     * Executes a js on the extension to clear the queries
     * @param clearQueriesOption CLEAR_FAVORITES to clear all favorites, CLEAR_HISTORY to clear all
     * history which is not favored.
     */
    public void cleanupQueries(PreferenceManager.ClearQueriesOptions clearQueriesOption) {
        if (clearQueriesOption == PreferenceManager.ClearQueriesOptions.CLEAR_FAVORITES) {
            executeJS("jsAPI.clearFavorites()");
        } else if (clearQueriesOption == PreferenceManager.ClearQueriesOptions.CLEAR_HISTORY) {
            executeJS("jsAPI.clearHistory()");
        } else if (clearQueriesOption == PreferenceManager.ClearQueriesOptions.CLEAR_BOTH) {
            executeJS("jsAPI.clearFavorites()");
            executeJS("jsAPI.clearHistory()");
        }
    }
}
