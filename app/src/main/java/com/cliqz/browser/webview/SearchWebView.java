package com.cliqz.browser.webview;

import android.content.Context;
import android.location.Location;
import android.os.Build;
import android.os.Debug;
import android.support.annotation.Nullable;
import android.util.Log;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.CliqzBrowserState;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.constant.SearchEngines;

/**
 * Created by kread on 13/07/15.
 */
public class SearchWebView extends BaseWebView {

    private static final String TAG = SearchWebView.class.getSimpleName();
    private static final boolean DO_PROFILE_QUERY = false;
    // app_debug includes single JS files, app includes minified JS
    private static final String CLIQZ_URL = "file:///android_asset/search/index.html";
    private static final String CLIQZ_MANIFEST_URL = "file:///android_asset/search/search.json";
    private String mLastQuery;
    private boolean mProfilingRunning = false;
    private boolean mSearchWithLocation = false;
    private CliqzBrowserState currentTabState;

    public SearchWebView(Context context) {
        super(context);
        bridge.setWebView(this);
    }

    @Nullable
    @Override
    protected AWVClient createClient() {
        return new SslWorkAroundClient() {
            @Override
            public boolean shouldOverrideUrlLoading(final AbstractionWebView wv, final String url) {
                Log.d(TAG, "New url: " + url);
                return (url == null) || (!url.startsWith("file:///android_asset/search"));
            }
        };
    }

    @Nullable
    @Override
    protected String getExtensionUrl() {
        if ("xwalk".equals(BuildConfig.FLAVOR)) {
            return CLIQZ_MANIFEST_URL;
        } else {
            return CLIQZ_URL;
        }
    }


    private boolean isCliqzUrl() {
        final String url = getUrl();
        return url != null && url.startsWith(CLIQZ_URL);
    }

    public void onQueryChanged(String q) {
        // If we only want to profile the query itself, start here
        if (DO_PROFILE_QUERY) {
            if (mProfilingRunning) {
                return;
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                Debug.startMethodTracingSampling("typing", 8 * 1024 * 1024, 500);
            } else {
                Debug.startMethodTracing("typing");
            }
        }

        final String query = q.toString().trim();
        Log.d(TAG, "Query: " + query);

        // If JS isn't ready yet, just store the query for now. Will be fetched once JS is ready
        if (!isExtensionReady() || !isCliqzUrl()) {
            mLastQuery = query;
            return;
        }

        performSearch(query);
    }

    @Override
    void extensionReady() {
        super.extensionReady();
        setDefaultSearchEngine();
        telemetry.sendStartingSignals("cards", "cold");
        // We are not sure this is called in onResume, especially if we were
        /*if (shouldShowHomePage()) {
            showHomepage();
            currentTabState.setTimestamp(System.currentTimeMillis());
        } else if (mLastQuery != null && !mLastQuery.isEmpty()) {
            performSearch(mLastQuery);
        } /*  TODO: Why?
        else {
            showHomepage();
        }
        */
    }

    public void setCurrentTabState(CliqzBrowserState currentTabState) {
        this.currentTabState = currentTabState;
    }

    public void performSearch(String query) {
        mLastQuery = query;
        final String lowerQuery = query.toLowerCase();
        currentTabState.setQuery(lowerQuery);
        final Location location = locationCache.getLastLocation();
        final boolean hasLocation = mSearchWithLocation && location != null;
        final double lat = hasLocation ? location.getLatitude() : 0.0;
        final double lon = hasLocation ? location.getLongitude() : 0.0;
        if (hasLocation) {
            currentTabState.setLatitude((float) lat);
            currentTabState.setLongitude((float) lon);
        } else {
            currentTabState.setLongitude(Float.MAX_VALUE);
            currentTabState.setLatitude(Float.MAX_VALUE);
        }
        final String call = String.format(Locale.US,
                "jsAPI.search('%1$s', %2$b, %3$.6f, %4$.6f)",
                lowerQuery, hasLocation, lat, lon);

        executeJS(call);
    }

    @Override
    public void onResume() {
        super.onResume();
        initPreferences();
        if (isExtensionReady()) {
            // Apply settings here
            initExtensionPreferences();
            setDefaultSearchEngine();
//            if (shouldShowHomePage()) {
//                showHomepage();
//            }
            }
    }

    private void initPreferences() {
        mSearchWithLocation = preferenceManager.getLocationEnabled();
    }

    public void initExtensionPreferences() {
        final JSONObject preferences = new JSONObject();
        try {
            preferences.put("adultContentFilter",
                    preferenceManager.getBlockAdultContent() ? "moderate" : "liberal");
            preferences.put("incognito", currentTabState.isIncognito() );
        } catch (JSONException e) {
            e.printStackTrace();
        }
        final String call =
                String.format(Locale.US, "jsAPI.setClientPreferences(%s);",
                        preferences.toString());
        executeJS(call);

        final boolean shouldRestoreTopSites = preferenceManager.getRestoreTopSites();
        if (shouldRestoreTopSites) {
            evaluateJavascript("jsAPI.restoreBlockedTopSites()",null);
            preferenceManager.setRestoreTopSites(false);
        }
    }

    public void showHomepage() {
        final JSONObject params = new JSONObject();
        try {
            switch (currentTabState.getMode()) {
                case SEARCH:
                    final float lon = currentTabState.getLongitude();
                    final float lat = currentTabState.getLatitude();
                    if ((lon < Float.MAX_VALUE - 1) && (lat < Float.MAX_VALUE - 1)) {
                        params.put("lat", lat);
                        params.put("lon", lon);
                    }
                    params.put("q", currentTabState.getQuery());
                    break;
                case WEBPAGE:
                    params.put("url", currentTabState.getUrl());
                    params.put("title", currentTabState.getTitle());
                    break;
            }
            executeJS(String.format(Locale.US, "jsAPI.resetState(%s);", params.toString()));
            bringToFront();
            currentTabState.setTimestamp(System.currentTimeMillis());
            currentTabState.setMode(CliqzBrowserState.Mode.SEARCH);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    private void setDefaultSearchEngine() {
        if (!isExtensionReady()) {
            return;
        }

        final JSONObject param = new JSONObject();
        final SearchEngines engine = preferenceManager.getSearchChoice();
        try {
            param.put("name", engine.engineName);
            param.put("url", engine.engineUrl);
            executeJS(String.format(Locale.US, "jsAPI.setDefaultSearchEngine(%s)", param.toString()));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    public void requestCardUrl() {
        executeJS("jsAPI.getCardUrl()");
    }

    //Disable scrolling the search web view
    @Override
    public boolean overScrollBy(int deltaX, int deltaY, int scrollX, int scrollY,
                                int scrollRangeX, int scrollRangeY, int maxOverScrollX,
                                int maxOverScrollY, boolean isTouchEvent) {
        return false;
    }

    @Override
    public void scrollTo(int x, int y) {
        // Do nothing
    }

    @Override
    public void computeScroll() {
        // Do nothing
    }

    @Override
    public void scrollBy(int x, int y) {
        //do nothing
    }
}
