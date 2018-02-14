package com.cliqz.browser.reactnative;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import javax.inject.Inject;

/**
 * @author Moaz Rashad
 */

public class AutoCompletion extends ReactContextBaseJavaModule implements Runnable {
    private static final String name = "AutoCompletion";
    private static final String TAG = AutoCompletion.class.getSimpleName();
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
            Log.w(TAG, "No url for autocompletion");
            return;
        }
        handler.post(this);
    }

    @Override
    public void run() {
        bus.post(new CliqzMessages.Autocomplete(mUrl));
    }
}

