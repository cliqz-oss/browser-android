package com.cliqz.browser.main.search;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.support.v4.content.ContextCompat;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import com.anthonycr.grant.PermissionsManager;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.JSYTDownloadCallback;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.browser.utils.AppBackgroundManager;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.webview.ExtensionEvents;
import com.cliqz.jsengine.Engine;
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
@SuppressLint("ViewConstructor")
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
    MainActivityHandler handler;

    @Inject
    Bus bus;

    @Inject
    AppBackgroundManager appBackgroundManager;

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
        // mReactView.setBackgroundColor(ContextCompat.getColor(this.context, R.color.normal_tab_primary_color));
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
            final Context context = getContext();
            if (state.isIncognito()) {
                appBackgroundManager.setViewBackgroundColor(mReactView,
                        ContextCompat.getColor(context, R.color.fresh_tab_incognito_background));
            } else if (preferenceManager.isBackgroundImageEnabled()) {
                appBackgroundManager.setViewBackground(mReactView,
                        ContextCompat.getColor(context, R.color.primary_color));
            } else {
                appBackgroundManager.setViewBackgroundColor(mReactView,
                        ContextCompat.getColor(context, R.color.fresh_tab_background));
            }
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
        boolean locationAccess = PermissionsManager.hasPermission(context, Manifest.permission.ACCESS_FINE_LOCATION);
        preferences.putString("share_location", locationAccess ? "yes" : "ask");


        engine.publishEvent(ExtensionEvents.CLIQZ_EVENT_SET_SEARCH_ENGINE, searchEngine.engineName, context.getString(searchEngine.engineUrl));
        engine.publishEvent(ExtensionEvents.CLIQZ_EVENT_NOTIFY_PREFERENCES, preferences);
    }

    private void performSearch(String query) {
        queryManager.addOrIgnoreQuery(query);
        state.setQuery(query);
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

    public void updateQuery(String query, int start, int count) {
        String keyCode = "";
        if (count == 0) {
            keyCode = "Backspace";
        } else if (count == 1) {
            final String key = String.valueOf(query.charAt(start)).toUpperCase();
            keyCode = "Key" + key;
        }
        WritableMap map = Arguments.createMap();
        map.putString("keyCode", keyCode);
        map.putBoolean("isTyped", true);
        map.putString("query", query);
        engine.publishEvent("urlbar:input", map);
        performSearch(query);
        bringToFront();
    }

    public boolean isFreshTabVisible() {
        return freshtab.getVisibility() == VISIBLE;
    }

    public void updateFreshTab() {
        freshtab.updateFreshTab();
    }

    public void handleUrlbarFocusChange(boolean hasFocus) {
        final String eventName = hasFocus ? ExtensionEvents.CLIQZ_EVENT_URL_BAR_FOCUS : ExtensionEvents.CLIQZ_EVENT_URL_BAR_BLUR;
        engine.publishEvent(eventName, Arguments.createMap());
    }
}
