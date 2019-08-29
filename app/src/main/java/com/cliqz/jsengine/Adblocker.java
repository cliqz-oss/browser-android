package com.cliqz.jsengine;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import timber.log.Timber;


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
        // module is always set as enabled and state managed via cliqz-adb pref
        this.engine.setPref("cliqz-adb-abtest", true);
        this.engine.setPref("cliqz-adb", enabled ? 1 : 0);
        this.engine.setPref("modules.adblocker.enabled", true);
    }

    @Nullable
    public ReadableMap getAdBlockingInfo(final int hashCode) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("adblocker:getAdBlockInfoForTab", hashCode);
            return response.getMap("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException |
                NoSuchKeyException ignored) {
        }
        return null;
    }

    public boolean isBlacklisted(final String url) {
        try {
            ReadableMap response = this.engine.getBridge().callAction("adblocker:isWhitelisted", url);
            return response.hasKey("result") && response.getBoolean("result");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException e) {
            Timber.e(e,"isBlacklisted error");
        }
        return false;
    }

    public void toggleUrl(final String url, final boolean domain) {
        try {
            final WritableMap event = Arguments.createMap();
            event.putString("option", domain ? "domain" : "page");
            event.putString("url", url);
            if (this.isBlacklisted(url)) {
                event.putString("status", "active");
                this.engine.getBridge().publishEvent("control-center:adb-activator", event);
            } else {
                event.putString("status", "off");
                this.engine.getBridge().publishEvent("control-center:adb-activator", event);
            }
        } catch (EngineNotYetAvailable ignored) {}
    }

}
