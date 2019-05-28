package com.cliqz.browser.webview;

import android.content.Context;
import androidx.annotation.Nullable;

import com.cliqz.browser.BuildConfig;

/**
 * Created by Ravjit on 04/08/16.
 */
public class FavoritesWebView extends HistoryWebView {

    private static final String FRESHTAB_URL_FAV = "file:///android_asset/search/favorites.html";
    private static final String FRESHTAB_MANIFEST_URL_FAV = "file:///android_asset/search/favorites.json";


    public FavoritesWebView(Context context) {
        super(context);
    }

    @Nullable
    @Override
    protected String getExtensionUrl() {
        if ("xwalk".equals(BuildConfig.FLAVOR_api)) {
            return FRESHTAB_MANIFEST_URL_FAV;
        } else {
        return FRESHTAB_URL_FAV;
    }
}
}

