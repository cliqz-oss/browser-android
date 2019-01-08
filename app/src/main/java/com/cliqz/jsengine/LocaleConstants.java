package com.cliqz.jsengine;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * @author Khaled Tantawy
 */
class LocaleConstants extends ReactContextBaseJavaModule {

    public LocaleConstants(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "LocaleConstants";
    }

    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> ua = new HashMap<>();
        ua.put("lang", Locale.getDefault().getLanguage());
        return ua;
    }
}
