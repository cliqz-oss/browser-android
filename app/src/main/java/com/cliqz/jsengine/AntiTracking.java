package com.cliqz.jsengine;

import android.util.Log;

import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;

/**
 * Created by sammacbeth on 08/05/2017.
 */

public class AntiTracking {

    private final Engine engine;

    public AntiTracking(Engine engine) {
        this.engine = engine;
    }

    public void setEnabled(boolean enabled) throws EngineNotYetAvailable {
        this.engine.setPref("modules.antitracking.enabled", enabled);
    }

    public ReadableMap getTabBlockingInfo(final int tabId) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("antitracking:getTrackerListForTab", tabId);
            return response.getMap("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException | NoSuchKeyException e) {
            Log.e("JSEngine", "getTabBlockingInfo error", e);
        }
        return null;
    }

    public void getTabThirdPartyInfo(final int tabId, final JSBridge.Callback callback) {
        try {
            this.engine.getBridge().callAction("aggregatedBlockingStats", callback, tabId);
        } catch (EngineNotYetAvailable e) {
            Log.e("JSEngine", "getTabThirdPartyInfo error", e);
        }
    }

    public boolean isWhitelisted(String url) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("antitracking:isSourceWhitelisted", url);
            return response.hasKey("result") && response.getBoolean("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException e) {
            Log.e("JSEngine", "isWhitelist error", e);
        }
        return false;
    }

    public void addDomainToWhitelist(final String url) {
        try {
            this.engine.getBridge().callAction("antitracking:addSourceDomainToWhitelist", new JSBridge.NoopCallback(), url);
        } catch (EngineNotYetAvailable e) {}
    }

    public void removeDomainFromWhitelist(final String url) {
        try {
            this.engine.getBridge().callAction("antitracking:removeSourceDomainFromWhitelist", new JSBridge.NoopCallback(), url);
        } catch (EngineNotYetAvailable e) {}
    }
}
