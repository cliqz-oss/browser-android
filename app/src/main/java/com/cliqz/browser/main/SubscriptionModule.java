package com.cliqz.browser.main;

import androidx.annotation.NonNull;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;

import java.util.HashMap;

import javax.inject.Inject;

/**
 * @author Khaled Tantawy
 */
public class SubscriptionModule extends ReactContextBaseJavaModule {

    private static final String TAG = SubscriptionModule.class.getSimpleName();

    @Inject
    Bus bus;

    @Inject
    SubscriptionsManager subscriptionsManager;

    public SubscriptionModule(ReactApplicationContext reactContext) {
        super(reactContext);

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public String getName() {
        return "SubscriptionModule";
    }

    @ReactMethod
    public void isSubscribedBatch(ReadableArray batch, Promise promise) {
        WritableArray result = Arguments.createArray();
        for (Object item : batch.toArrayList()) {
            final HashMap<String, String> map = (HashMap<String, String>) item;
            result.pushBoolean(subscriptionsManager.isSubscribed(map.get("type"), map.get("subtype"), map.get("id")));
        }
        promise.resolve(result);
    }

    @ReactMethod
    public void isSubscribed(@NonNull String type, @NonNull String subtype, @NonNull String id, Promise promise) {
        promise.resolve(subscriptionsManager.isSubscribed(type, subtype, id));
    }

    @ReactMethod
    public void subscribeToNotifications(String type, String subtype, String id, Promise promise) {
        bus.post(new CliqzMessages.Subscribe(type, subtype, id, promise));
    }

    @ReactMethod
    public void unsubscribeToNotifications(String type, String subtype, String id, Promise promise) {
        bus.post(new CliqzMessages.Unsubscribe(type, subtype, id, promise));
    }
}

