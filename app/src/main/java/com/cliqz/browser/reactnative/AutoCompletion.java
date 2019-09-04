package com.cliqz.browser.reactnative;

import android.os.Handler;
import android.os.Looper;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import javax.inject.Inject;

import timber.log.Timber;

/**
 * @author Moaz Rashad
 */

public class AutoCompletion extends ReactContextBaseJavaModule implements Runnable {
    private static final String name = "AutoCompletion";
    private final Handler handler;
    @Inject
    Bus bus;
    private String mUrl;

    public AutoCompletion(ReactApplicationContext reactContext) {
        super(reactContext);

        handler = new Handler(Looper.getMainLooper());

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public String getName() {
        return name;
    }

    @ReactMethod
    public void autoComplete(String data) {
        mUrl = (data instanceof String) ? (String) data : null;
        if (mUrl == null) {
            Timber.w("No url for autocompletion");
            return;
        }
        handler.post(this);
    }

    @Override
    public void run() {
        bus.post(new CliqzMessages.Autocomplete(mUrl));
    }
}

