package com.cliqz.browser.reactnative;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;

/**
 * @author Khaled Tantawy
 */
public class BrowserActions extends ReactContextBaseJavaModule {

    private static final String TAG = BrowserActions.class.getSimpleName();

    // Used to post bus messages on the main thread
    private final Handler handler;

    @Inject
    HistoryDatabase historyDatabase;

    public BrowserActions(ReactApplicationContext reactContext) {
        super(reactContext);

        handler = new Handler(Looper.getMainLooper());

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public String getName() {
        return "BrowserActions";
    }

    @ReactMethod
    public void searchHistory(String query, Callback callback) {
        if (query != null && !query.isEmpty()) {
            final Bundle[] historyResults = historyDatabase.searchHistory(query, 5);
            final WritableArray historyArray = Arguments.fromArray(historyResults);
            callback.invoke(historyArray);
        } else {
            callback.invoke(Arguments.createArray());
        }
    }
}

