package com.cliqz.jsengine;

import android.support.annotation.Nullable;
import android.util.Log;

import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;


/**
 * @author Sam Macbeth
 */

public class Adblocker {

    private final Engine engine;

    public Adblocker(Engine engine, final boolean initialState) {
        this.engine = engine;
        this.engine.registerStartupCallback(new Runnable() {
            @Override
            public void run() {
                try {
                    setEnabled(initialState);
                } catch(EngineNotYetAvailable ignored) {}
            }
        });
    }

    public void setEnabled(boolean enabled) throws EngineNotYetAvailable {
        this.engine.setPref("cliqz-adb-abtest", true);
        this.engine.setPref("cliqz-adb", enabled ? 1 : 0);
        this.engine.setPref("modules.adblocker.enabled", enabled);
    }

    @Nullable
    public ReadableMap getAdBlockingInfo(final int hashCode) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("adblocker:getAdBlockInfo", hashCode);
            return response.getMap("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException |
                NoSuchKeyException ignored) {
        }
        return null;
    }

    public boolean isBlacklisted(final String url) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("adblocker:isDomainInBlacklist", url);
            return response.hasKey("result") && response.getBoolean("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException e) {
            Log.e("JSEngine", "isBlacklisted error", e);
        }
        return false;
    }

    public void toggleUrl(final String url, final boolean domain) {
        try {
            this.engine.getBridge().callAction("adblocker:toggleUrl", new JSBridge.NoopCallback(), url, domain);
        } catch (EngineNotYetAvailable ignored) {}
    }

}
