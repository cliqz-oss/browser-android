package com.cliqz.browser.reactnative;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;

import org.jetbrains.annotations.NotNull;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;

/**
 * @author Khaled Tantawy
 */
public class BrowserActions extends ReactContextBaseJavaModule {

    // Used to post bus messages on the main thread
    private final Handler mHandler;
    private final Bus mBus;

    @Inject
    HistoryDatabase historyDatabase;

    public BrowserActions(ReactApplicationContext reactContext, Bus bus) {
        super(reactContext);

        mHandler = new Handler(Looper.getMainLooper());
        mBus = bus;

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @NotNull
    @Override
    public String getName() {
        return "BrowserActions";
    }

    @ReactMethod
    public void callNumber(String number, ReadableMap toBeIgnored) {
       callNumber(number);
    }

    @ReactMethod
    public void callNumber(String number) {
        if (number != null) {
            mHandler.post(() -> mBus.post(new CliqzMessages.CallNumber(number)));
        }
    }

    @ReactMethod
    public void openMap(String mapUrl) {
        openLink(mapUrl, "");
    }

    @ReactMethod
    public void hideKeyboard() {
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

    @ReactMethod
    public void openLink(final String url, final String query) {
        if (url != null) {
            mHandler.post(() -> mBus.post(CliqzMessages.OpenLink.open(url)));
        }
    }
}

