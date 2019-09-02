package com.cliqz.browser.main.search;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.AttrRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.anthonycr.grant.PermissionsManager;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.JSYTDownloadCallback;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.browser.starttab.StartTabContainer;
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
public class SearchView extends FrameLayout {

    private final Incognito incognito;

    private ReactRootView mReactView;

    private StartTabContainer startTabContainer;

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

    @Inject
    Engine engine;

    private final Context context;
    private CliqzBrowserState state;

    public SearchView(@NonNull Context context) {
        this(context, null);
    }

    public SearchView(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public SearchView(@NonNull Context context, @Nullable AttributeSet attrs,
                       @AttrRes int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        this.context = context;
        mReactView = engine.reactRootView;
        startTabContainer = new StartTabContainer(this.context);
        incognito = BuildConfig.IS_NOT_LUMEN ? new Incognito(this.context) : null;
        // mReactView.setBackgroundColor(ContextCompat.getColor(this.context, R.color.normal_tab_primary_color));
        mReactView.setLayoutParams(
                new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        final ViewGroup parent = (ViewGroup) mReactView.getParent();
        if (parent != null) {
            parent.removeView(mReactView);
        }
        addView(mReactView);
        if (incognito != null) {
            incognito.setVisibility(GONE);
            addView(incognito);
        }
        addView(startTabContainer);
    }

    @Override
    public void bringToFront() {
        super.bringToFront();
        final String query = state.getQuery();
        if (query.equals("")) {
            setIncognito(state.isIncognito());
            mReactView.setVisibility(View.GONE);
            startTabContainer.updateFreshTab();
        } else {
            mReactView.bringToFront();
            startTabContainer.setVisibility(View.GONE);
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
        engine.callAction("video-downloader:getVideoLinks", new JSYTDownloadCallback(bus,handler), url);
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
        setIncognito(state.isIncognito());
    }

    private void setIncognito(boolean enabled) {
        final boolean shouldShowIncognitoView = enabled && incognito != null && incognito.getVisibility() != VISIBLE;
        final boolean shouldShowRegularView = !enabled && startTabContainer.getVisibility() != VISIBLE;

        if (shouldShowIncognitoView) {
            incognito.bringToFront();
            incognito.setVisibility(VISIBLE);
            startTabContainer.setVisibility(GONE);
        }
        if (shouldShowRegularView) {
            startTabContainer.bringToFront();
            startTabContainer.setVisibility(VISIBLE);
            if (incognito != null) {
                incognito.setVisibility(GONE);
            }
        }
    }

    public void updateQuery(String query, int start, int count) {
        if (BuildConfig.IS_LUMEN) {
            return;
        }
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
        return startTabContainer.getVisibility() == VISIBLE;
    }

    public void updateFreshTab() {
        startTabContainer.updateFreshTab();
    }

    public void handleUrlbarFocusChange(boolean hasFocus) {
        final String eventName = hasFocus ? ExtensionEvents.CLIQZ_EVENT_URL_BAR_FOCUS : ExtensionEvents.CLIQZ_EVENT_URL_BAR_BLUR;
        engine.publishEvent(eventName, Arguments.createMap());
    }

    public void showFavorites() {
        startTabContainer.gotToFavorites();
    }
}
