package com.cliqz.browser.telemetry;

import javax.inject.Inject;
import javax.inject.Singleton;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
@Singleton
public class Timings {

    private final PreferenceManager preferenceManager;

    @Inject
    public Timings(PreferenceManager preferenceManager) {
        this.preferenceManager = preferenceManager;
    }

    private long mAppStartTime;
    private long mAppStopTime;
    private long mLayerStartTime;
    private long mLastTypedTime;
    private long mUrlBarFocusedTime;
    private long mNetworkStartTime;
    private long mPageStartTime;
    private long mOverFlowMenuStartTime;

    /**
     * Set the start time when the app is foreground
     */
    public void setAppStartTime() {
        mAppStartTime = getCurrentTime();
    }

    /**
     * Set the stop time when the app goes to background
     */
    public void setAppStopTime() {
        mAppStopTime = getCurrentTime();
    }

    /**
     * Set the start time of the layer when a layer/fragment becomes visible
     */
    void setLayerStartTime() {
        mLayerStartTime = getCurrentTime();
    }

    /**
     * Set the start time of a webpage. Whenever a new webpage is loaded
     */
    void setPageStartTime() {
        mPageStartTime = getCurrentTime();
    }

    /**
     * Set the time when the last environment signal was sent
     */
    public void setLastEnvSingalTime() {
        preferenceManager.setTimeOfLastEnvSignal(getCurrentTime());
    }

    /**
     * Set the start time whenever the user switches to a new network
     */
    void setNetworkStartTime() {
        mNetworkStartTime = getCurrentTime();
    }

    /**
     * Set the time when the last character was typed
     */
    public void setLastTypedTime() {
        mLastTypedTime = getCurrentTime();
    }

    /**
     * Set the time when the url bar became focused
     */
    public void setUrlBarFocusedTime() {
        mUrlBarFocusedTime = getCurrentTime();
    }

    void setOverFlowMenuStartTime() {
        mOverFlowMenuStartTime = getCurrentTime();
    }

    /**
     * @return the time for which the app was in foreground
     */
    long getAppUsageTime() {
        return mAppStopTime - mAppStartTime;
    }

    /**
     * @return the time for which the current layer was displayed
     */
    long getLayerDisplayTime() {
        return getCurrentTime() - mLayerStartTime;
    }

    long getPageDisplayTime() {
        return getCurrentTime() - mPageStartTime;
    }

    long getNetworkUsageTime() {
        return (getCurrentTime() - mNetworkStartTime)/1000;
    }

    public long getTimeSinceLastEnvSignal() {
        return getCurrentTime()- preferenceManager.getTimeOfLastEnvSignal();
    }

    /**
     * Returns time since user stopped typing
     */
    long getReactionTime() {
        return getCurrentTime() - mLastTypedTime;
    }

    /**
     * Returns time since url bar is focused
     */
    long getUrlBarTime() {
        return getCurrentTime() - mUrlBarFocusedTime;
    }

    private long getCurrentTime() {
        return (long)Math.floor(System.currentTimeMillis());
    }

    long getAppStartUpTime() {
        return getCurrentTime() - mAppStartTime;
    }

    long getOverFlowMenuUseTime() {
        return getCurrentTime() - mOverFlowMenuStartTime;
    }
}
