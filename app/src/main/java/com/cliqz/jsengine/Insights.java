package com.cliqz.jsengine;

import android.util.Log;

import com.cliqz.browser.controlcenter.InsightsDataCallback;
import com.facebook.react.bridge.NoSuchKeyException;

/**
 * @author Ravjit Uppal
 */
public class Insights {

    private final Engine engine;

    public Insights(Engine engine) {
        this.engine = engine;
    }

    public void setEnabled(boolean enabled) throws EngineNotYetAvailable {
        this.engine.setPref("modules.insights.enabled", enabled);
    }

    public void getInsightsData(InsightsDataCallback callback, String period) {
        try {
            this.engine.getBridge().callAction("insights:getDashboardStats", result ->
                    callback.updateViews(result), period);
        } catch (EngineNotYetAvailable e) {
            Log.e("JSEngine", "Insights getInsightsData error", e);
        }
    }

    public void clearData() {
        try {
            this.engine.getBridge().callAction("insights:clearData");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException | NoSuchKeyException e) {
            Log.e("JSEngine", "Insights clearData error", e);
        }
    }
}
