package com.cliqz.jsengine;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

import java.util.HashMap;
import java.util.Map;

import javax.annotation.Nullable;

/**
 * @author Sam Macbeth
 */
class UserAgentConstants extends ReactContextBaseJavaModule {

    private final boolean isTablet;

    UserAgentConstants(ReactApplicationContext reactContext) {
        super(reactContext);
        this.isTablet = reactContext.getResources().getBoolean(R.bool.isTablet);
    }

    @Override
    public String getName() {
        return "UserAgentConstants";
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> ua = new HashMap<>();
        ua.put("isTablet", this.isTablet);
        ua.put("channel", BuildConfig.TELEMETRY_CHANNEL);
        ua.put("appVersion", BuildConfig.VERSION_NAME);
        return ua;
    }
}
