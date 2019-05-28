package com.cliqz.browser.reactnative;

import androidx.annotation.NonNull;
import android.util.Log;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import org.json.JSONException;
import org.json.JSONObject;

import javax.inject.Inject;

/**
 * @author Khaled Tantawy
 */

public class TelemetryModule extends ReactContextBaseJavaModule {

    private static final String name = "Telemetry";
    private static final String TAG = TelemetryModule.class.getSimpleName();

    @Inject
    Telemetry telemetry;

    public TelemetryModule(ReactApplicationContext reactContext) {
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
    public void sendTelemetry(@NonNull String data) {
        try {
            telemetry.saveExtSignal(new JSONObject(data));
        } catch (JSONException e) {
            Log.e(TAG, "Unable to parse telemetry message", e);
        }
    }
}

