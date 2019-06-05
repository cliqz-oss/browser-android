package com.cliqz.jsengine;

import com.cliqz.browser.controlcenter.InsightsDataCallback;

/**
 * @author Ravjit Uppal
 */
public class Insights {

    private final Engine engine;

    public Insights(Engine engine) {
        this.engine = engine;
    }

    public void getInsightsData(InsightsDataCallback callback, String period) {
        try {
            this.engine.getBridge().callAction("insights:getDashboardStats", result ->
                    callback.updateViews(result), period);
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            engineNotYetAvailable.printStackTrace();
        }
    }
}
