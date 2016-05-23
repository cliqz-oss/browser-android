package com.cliqz.browser.webview;

import android.content.Context;
import android.support.annotation.Nullable;

import com.cliqz.browser.BuildConfig;

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
        if ("xwalk".equals(BuildConfig.FLAVOR)) {
            return FRESHTAB_MANIFEST_URL;
        } else {
            return FRESHTAB_URL;
        }
    }

    public void fourceUpdateHistory() {
        executeJS("osAPI.searchHistory(\"\", \"History.showHistory\")");
    }

    public void cleanupQueries(boolean b) {
        executeJS(String.format("jsAPI.clearQueries(%s)", b ? "true" : "false"));
    }
}
