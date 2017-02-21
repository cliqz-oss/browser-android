package com.cliqz.jsengine;

import android.annotation.TargetApi;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.utils.StreamUtils;

import org.json.JSONObject;

import java.util.Collections;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.utils.AdBlock;

/**
 * Created by sammacbeth on 22/06/16.
 */
public class AntiTracking {

    private final Engine engine;

    @Inject
    public AntiTracking(final Engine engine) {
        this.engine = engine;
    }

    public boolean isEnabled() {
        return engine.mEnabled;
    }

    public void setEnabled(boolean value) {
        engine.mEnabled = value;
    }

    public static Map<String, Object> getDefaultPrefs() {
        return Collections.emptyMap();
    }

    //dummy method to suppress the error
    public JSONObject getTabBlockingInfo(int i) {
        return null;
    }

    public boolean isWhitelisted(String host) {
        return true;
    }

    public void removeDomainFromWhitelist(String host) {
        // Stub
    }

    public void addDomainToWhitelist(String host) {
        // Stub
    }

}
