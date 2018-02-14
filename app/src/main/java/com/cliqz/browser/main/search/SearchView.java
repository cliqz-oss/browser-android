package com.cliqz.browser.main.search;

import android.content.Context;
import android.location.Location;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.JSYTDownloadCallback;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.webview.ExtensionEvents;
import com.cliqz.jsengine.Engine;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.cliqz.nove.Bus;
import com.facebook.react.ReactRootView;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;

import javax.inject.Inject;

import acr.browser.lightning.constant.SearchEngines;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Khaled Tantawy
 */
public class SearchView extends FrameLayout {

    private static final String TAG = SearchView.class.getSimpleName();

    private final Incognito incognito;

    private ReactRootView mReactView;

    public Freshtab freshtab;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    SubscriptionsManager subscriptionsManager;

    @Inject
    LocationCache locationCache;

    @Inject
    MainActivityHandler handler;

    @Inject
    Bus bus;

    @Inject
    QueryManager queryManager;

    private final Context context;
    private final Engine engine;
    private CliqzBrowserState state;

    public SearchView(Context context, Engine engine) {
        super(context);
        final MainActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        this.context = context;
        this.engine = engine;
        mReactView = engine.reactRootView;
        freshtab = new Freshtab(this.context);
        incognito = new Incognito(this.context);
        mReactView.setBackgroundColor(ContextCompat.getColor(this.context, R.color.normal_tab_primary_color));
        mReactView.setLayoutParams(
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        final ViewGroup parent = (ViewGroup) mReactView.getParent();
        if (parent != null) {
            parent.removeView(mReactView);
        }
        addView(mReactView);
        addView(incognito);
        addView(freshtab);

    }

    @Override
    public void bringToFront() {
        super.bringToFront();
        final String query = state.getQuery();
        if (query.equals("")) {
            if (state.isIncognito()) {
                incognito.bringToFront();
                incognito.setVisibility(View.VISIBLE);
                freshtab.setVisibility(View.GONE);
            } else {
                freshtab.bringToFront();
                freshtab.setVisibility(View.VISIBLE);
                incognito.setVisibility(View.GONE);
            }
            mReactView.setVisibility(View.GONE);

        } else {
            mReactView.bringToFront();
            freshtab.setVisibility(View.GONE);
            mReactView.setVisibility(View.VISIBLE);
        }
    }

    public void fetchYouTubeUrls(String url) {
        engine.callAction("video-downloader:findVideoLinks",new JSYTDownloadCallback(bus,handler),url);
    }

    public void initExtensionPreferences() {
        final SearchEngines searchEngine = preferenceManager.getSearchChoice();
        final WritableMap preferences = Arguments.createMap();
        preferences.putString("adultContentFilter",
                preferenceManager.getBlockAdultContent() ? "conservative" : "liberal");
        preferences.putBoolean("incognito", state != null && state.isIncognito());
        preferences.putString("backend_country", preferenceManager.getCountryChoice().countryCode);
        preferences.putBoolean("suggestionsEnabled", preferenceManager.getQuerySuggestionEnabled());

        //TODO: need to discuss the problem in detail here. just a quick fix for now
        try {
            engine.getBridge().publishEvent(ExtensionEvents.CLIQZ_EVENT_SET_SEARCH_ENGINE, searchEngine.engineName, context.getString(searchEngine.engineUrl));
            engine.getBridge().publishEvent(ExtensionEvents.CLIQZ_EVENT_NOTIFY_PREFERENCES, preferences);
            engine.getBridge().publishEvent(ExtensionEvents.CLIQZ_EVENT_URL_BAR_FOCUS);
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            engineNotYetAvailable.printStackTrace();
        }
    }

    public void notifySearchWebViewEvent(String eventName) {
//        mReactView.notifyEvent(eventName);
    }

    private void performSearch(String query) {
        queryManager.addOrIgnoreQuery(query);
        state.setQuery(query);
        final Location location = locationCache.getLastLocation();
        final boolean hasLocation = preferenceManager.getLocationEnabled() && location != null;
        final double lat = hasLocation ? location.getLatitude() : 0.0;
        final double lon = hasLocation ? location.getLongitude() : 0.0;

        try {
            engine.getBridge().publishEvent("search", query, hasLocation, lat, lon);
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            Log.i(TAG, "Can't get the brigde", engineNotYetAvailable);
        }
    }

    public void onResume() {
        // TODO: investigate what view should be resumed
        initExtensionPreferences();
    }

    public void setCurrentTabState(CliqzBrowserState state) {
        this.state = state;
//        mReactView.setCurrentTabState(state);
        if (state.isIncognito()) {
            if (incognito.getVisibility() == VISIBLE) {
                return;
            }
            incognito.bringToFront();
            incognito.setVisibility(View.VISIBLE);
            freshtab.setVisibility(View.GONE);
        } else {
            if (freshtab.getVisibility() == VISIBLE) {
                return;
            }
            freshtab.bringToFront();
            freshtab.setVisibility(View.VISIBLE);
            incognito.setVisibility(View.GONE);
        }
    }

    public void requestCardUrl() {
//        cardsView.requestCardUrl();
    }

    public void updateQuery(String query) {
        performSearch(query);
        bringToFront();
    }

    public boolean isFreshTabVisible() {
        return freshtab.getVisibility() == VISIBLE;
    }
}
