package com.cliqz.browser.webview;
import android.content.Context;
import android.location.Location;
import android.os.Build;
import android.os.Debug;
import android.support.annotation.Nullable;
import android.util.Log;
import android.view.ViewGroup;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.CliqzBrowserState;
import org.json.JSONException;
import org.json.JSONObject;
import acr.browser.lightning.constant.SearchEngines;

/**
 * @author Kevin Read
 * @author Stefano Pacifici
 * @author Ravjit Uppal
 */
public class SearchWebView extends BaseWebView {

    private static final String TAG = SearchWebView.class.getSimpleName();
    private static final boolean DO_PROFILE_QUERY = false;
    // app_debug includes single JS files, app includes minified JS
    private static final String CLIQZ_URL = "file:///android_asset/search/index.html";
    private static final String CLIQZ_MANIFEST_URL = "file:///android_asset/search/search.json";
    @SuppressWarnings("FieldCanBeLocal")
    private boolean mProfilingRunning = false;
    private CliqzBrowserState currentTabState;

    public SearchWebView(Context context) {
        super(context);
        getBridge().setWebView(this);
    }

    @Nullable
    @Override
    protected AWVClient createClient() {
        return new AWVClient() {
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
        if ("xwalk".equals(BuildConfig.FLAVOR_api)) {
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

        final String query = q.trim();
        Log.d(TAG, "Query: " + query);

        // If JS isn't ready yet, just store the query for now. Will be fetched once JS is ready
        if (!isCliqzUrl()) {
            return;
        }

        performSearch(query);
    }

    @Override
    public void extensionReady() {
        super.extensionReady();
        setDefaultSearchEngine();
        initExtensionPreferences();
        telemetry.sendStartingSignals("cards", "cold");
    }

    public void setCurrentTabState(CliqzBrowserState currentTabState) {
        this.currentTabState = currentTabState;
    }

    public void performSearch(String query) {
        final String lowerQuery = query.toLowerCase();
        final Location location = locationCache.getLastLocation();
        final boolean hasLocation = preferenceManager.getLocationEnabled() && location != null;
        final double lat = hasLocation ? location.getLatitude() : 0.0;
        final double lon = hasLocation ? location.getLongitude() : 0.0;

        notifyEvent(ExtensionEvents.CLIQZ_EVENT_SEARCH, lowerQuery, hasLocation, lat, lon);
    }

    @Override
    public void onResume() {
        super.onResume();
        // Apply settings here
        initExtensionPreferences();
        setDefaultSearchEngine();
    }

    @Override
    public void bringToFront() {
        final ViewGroup container = (ViewGroup) getParent();
        //return if the view is already on top
        if (container.getChildAt(container.getChildCount()-1).getId() == getId()) {
            return;
        }
        super.bringToFront();
        isVisible();
    }

    public void initExtensionPreferences() {
        final JSONObject preferences = new JSONObject();
        try {
            preferences.put("adultContentFilter",
                    preferenceManager.getBlockAdultContent() ? "moderate" : "liberal");
            preferences.put("incognito", currentTabState != null && currentTabState.isIncognito());
            preferences.put("backend_country", preferenceManager.getCountryChoice().countryCode);
            preferences.put("suggestionsEnabled", preferenceManager.getQuerySuggestionEnabled());
//            preferences.put("subscriptions", subscriptionsManager.toJSONObject());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        notifyEvent(ExtensionEvents.CLIQZ_EVENT_NOTIFY_PREFERENCES, preferences);
        //TODO: need to discuss the problem in detail here. just a quick fix for now
        notifyEvent(ExtensionEvents.CLIQZ_EVENT_URL_BAR_FOCUS);
    }

    private void setDefaultSearchEngine() {
        final SearchEngines engine = preferenceManager.getSearchChoice();
        notifyEvent(ExtensionEvents.CLIQZ_EVENT_SET_SEARCH_ENGINE, engine.engineName, context.getString(engine.engineUrl));
    }

    public void requestCardUrl() {
        notifyEvent(ExtensionEvents.CLIQZ_EVENT_PUBLISH_CARD_URL);
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
