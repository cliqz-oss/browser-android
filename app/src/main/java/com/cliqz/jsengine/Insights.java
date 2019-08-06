package com.cliqz.jsengine;

import com.cliqz.browser.controlcenter.InsightsDataCallback;
import com.facebook.react.bridge.NoSuchKeyException;

import timber.log.Timber;

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
            Timber.e(e, "Insights getInsightsData error");
        }
    }

    public void clearData() {
        try {
            this.engine.getBridge().callAction("insights:clearData");
        } catch (EngineNotYetAvailable | ActionNotAvailable | EmptyResponseException | NoSuchKeyException e) {
            Timber.e(e, "Insights clearData error");
        }
    }
}
