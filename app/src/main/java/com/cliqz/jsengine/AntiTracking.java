package com.cliqz.jsengine;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;

import timber.log.Timber;

/**
 * Created by sammacbeth on 08/05/2017.
 */

public class AntiTracking {

    private final Engine engine;

    public AntiTracking(@NonNull Engine engine) {
        this.engine = engine;
    }

    public void setEnabled(boolean enabled) throws EngineNotYetAvailable {
        this.engine.setPref("modules.antitracking.enabled", enabled);
    }

    @Nullable
    public ReadableMap getTabBlockingInfo(final int tabId) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("antitracking:getTabBlockingInfo", tabId, null);
            return response.getMap("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException | NoSuchKeyException e) {
            Timber.e(e, "getTabBlockingInfo error");
        }
        return null;
    }


    public void getTabThirdPartyInfo(final int tabId, @NonNull final JSBridge.Callback callback) {
        try {
            this.engine.getBridge().callAction("aggregatedBlockingStats", callback, tabId);
        } catch (EngineNotYetAvailable e) {
            Timber.e(e, "getTabThirdPartyInfo error");
        }
    }

    public boolean isWhitelisted(@NonNull String url) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("antitracking:isWhitelisted", url);
            return response.hasKey("result") && response.getBoolean("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException e) {
            Timber.e(e, "isWhitelist error");
        }
        return false;
    }

    public void addDomainToWhitelist(@NonNull final String url) {
        try {
            this.engine.getBridge().callAction("antitracking:addSourceDomainToWhitelist", new JSBridge.NoopCallback(), url);
        } catch (EngineNotYetAvailable e) {
            Timber.e(e, "Can't add %s to the white list", url);
        }
    }

    public void removeDomainFromWhitelist(@NonNull final String url) {
        try {
            this.engine.getBridge().callAction("antitracking:removeSourceDomainFromWhitelist", new JSBridge.NoopCallback(), url);
        } catch (EngineNotYetAvailable e) {
            Timber.e(e, "Can't remove %s from the white list", url);
        }
    }
}
