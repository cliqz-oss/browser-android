package com.cliqz.jsengine;

import org.json.JSONObject;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ExecutionException;

/**
 * Created by sammacbeth on 09/12/2016.
 */

public class Adblocker {

    public Adblocker(final Engine engine) {

    }

    public void setEnabled(final boolean enabled) throws ExecutionException {

    }

    public static Map<String, Object> getDefaultPrefs() {
        return Collections.emptyMap();
    }

    public static Map<String, Object> getDefaultPrefs(boolean unused) {
        return Collections.emptyMap();
    }
    
    public boolean isBlacklisted(String mUrl) {
        return false;
    }

    public void toggleUrl(String mUrl, boolean value) {
        // Stub
    }

    public JSONObject getAdBlockingInfo(String mUrl) {
        return new JSONObject();
    }
}
