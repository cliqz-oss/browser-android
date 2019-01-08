package com.cliqz.browser.reactnative;

import android.Manifest;
import android.content.pm.PackageManager;
import android.support.annotation.NonNull;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;
import javax.inject.Inject;

/**
 * @author Stefano Pacifici
 */
public class PermissionManagerModule extends ReactContextBaseJavaModule {

    private static final Map<String, Object> CONSTANTS;

    public PermissionManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Inject
    Bus bus;

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        return CONSTANTS;
    }

    @Override
    public String getName() {
        return "PermissionManagerModule";
    }

    @ReactMethod
    public void check(@NonNull String permission, Promise promise) {
        bus.post(new ReactMessages.CheckPermission(permission, promise));
    }

    @ReactMethod
    public void request(@NonNull String permission, Promise promise) {
        bus.post(new ReactMessages.RequestPermission(permission, promise));
    }

    static {
        final Map<String, String> permissions = new HashMap<>();
        permissions.put("WRITE_EXTERNAL_STORAGE", Manifest.permission.WRITE_EXTERNAL_STORAGE);
        permissions.put("ACCESS_FINE_LOCATION", Manifest.permission.ACCESS_FINE_LOCATION);

        final Map<String, Object> results = new HashMap<>();
        results.put("GRANTED", PackageManager.PERMISSION_GRANTED);
        results.put("DENIED", PackageManager.PERMISSION_DENIED);

        CONSTANTS = new HashMap<>();
        CONSTANTS.put("PERMISSIONS", permissions);
        CONSTANTS.put("RESULTS", results);
    }
}
