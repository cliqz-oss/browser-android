package com.cliqz.browser.reactnative;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import javax.inject.Inject;

import acr.browser.lightning.constant.SearchEngines;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Khaled Tantawy
 */
public class SearchEnginesModule extends ReactContextBaseJavaModule {

    private static final String TAG = SearchEnginesModule.class.getSimpleName();
    private final ReactApplicationContext mReactContext;

    @Inject
    PreferenceManager preferenceManager;

    public SearchEnginesModule(ReactApplicationContext reactContext) {
        super(reactContext);

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }

        mReactContext = reactContext;
    }

    @Override
    public String getName() {
        return "SearchEnginesModule";
    }

    @ReactMethod
    public void getSearchEngines(Promise promise) {
        SearchEngines[] engines = SearchEngines.values();
        SearchEngines defaultEngine = preferenceManager.getSearchChoice();
        WritableArray result = Arguments.createArray();
        String type = "text/html";
        String searchTerm = "{SearchTerm}";
        String localeTerm = "{LocaleTerm}";
        for (SearchEngines engine : engines) {
            String url = mReactContext.getString(engine.engineUrl);
            WritableMap map = Arguments.createMap();
            WritableMap urls = Arguments.createMap();
            urls.putString(type, url + searchTerm);
            map.putString("name", engine.engineName);
            map.putBoolean("default", engine == defaultEngine);
            map.putString("base_url", url);
            map.putMap("urls", urls);
            map.putString("SearchTermComponent", searchTerm);
            map.putString("LocaleTermComponent", localeTerm);
            result.pushMap(map);
        }
        promise.resolve(result);
    }
}

