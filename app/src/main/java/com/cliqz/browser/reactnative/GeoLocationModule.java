package com.cliqz.browser.reactnative;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import android.location.Location;
import com.cliqz.browser.utils.LocationCache;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;

import javax.inject.Inject;

/**
 * @author Khaled Tantawy
 */

public class GeoLocationModule extends ReactContextBaseJavaModule {

    private static final String name = "GeoLocation";
    private static final String TAG = GeoLocationModule.class.getSimpleName();

    @Inject
    LocationCache locationCache;

    public GeoLocationModule(ReactApplicationContext reactContext) {
        super(reactContext);

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
    public void getCurrentPosition(final Promise promise) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                int limit = 3;
                while (limit > 0) {
                    limit --;
                    Location location = locationCache.getLastLocation();
                    if (location != null) {
                        final double lat = location.getLatitude();
                        final double lon = location.getLongitude();
                        WritableMap map = Arguments.createMap();
                        map.putDouble("latitude", lat);
                        map.putDouble("longitude", lon);
                        promise.resolve(map);
                        return;
                    }
                    try {
                        Thread.sleep(200);
                    } catch (InterruptedException e) {
                        e.printStackTrace();
                    }
                }
                promise.reject("Unable to retrieve location");
            }
        }).run();
    }
}

