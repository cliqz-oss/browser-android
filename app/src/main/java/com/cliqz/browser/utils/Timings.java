package com.cliqz.browser.utils;

import javax.inject.Inject;
import javax.inject.Singleton;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * Created by Ravjit on 16/12/15.
 */
@Singleton
public class Timings {

    @Inject
    public Timings() {
    }

    @Inject
    PreferenceManager mPreferenceManager;

    private long mAppStartTime;
    private long mAppStopTime;
    private long mLayerStartTime;
    private long mLastTypedTime;
    private long mUrlBarFocusedTime;
    private long mNetworkStartTime;
    private long mPageStartTime;
    private long mOverFlowMenuStartTime;
    private long mAttrackStartTime;

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
    public void setLayerStartTime() {
        mLayerStartTime = getCurrentTime();
    }

    /**
     * Set the start time of a webpage. Whenever a new webpage is loaded
     */
    public void setPageStartTime() {
        mPageStartTime = getCurrentTime();
    }

    /**
     * Set the time when the last environment signal was sent
     */
    public void setLastEnvSingalTime() {
        mPreferenceManager.setTimeOfLastEnvSignal(getCurrentTime());
    }

    /**
     * Set the start time whenever the user switches to a new network
     */
    public void setNetworkStartTime() {
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

    public void setOverFlowMenuStartTime() {
        mOverFlowMenuStartTime = getCurrentTime();
    }

    public void setAttrackStartTime() {
        mAttrackStartTime = getCurrentTime();
    }
    /**
     * @return the time for which the app was in foreground
     */
    public long getAppUsageTime() {
        return mAppStopTime - mAppStartTime;
    }

    /**
     * @return the time for which the current layer was displayed
     */
    public long getLayerDisplayTime() {
        return getCurrentTime() - mLayerStartTime;
    }

    public long getPageDisplayTime() {
        return getCurrentTime() - mPageStartTime;
    }

    public long getNetworkUsageTime() {
        return (getCurrentTime() - mNetworkStartTime)/1000;
    }

    public long getTimeSinceLastEnvSignal() {
        return getCurrentTime()-mPreferenceManager.getTimeOfLastEnvSignal();
    }

    /**
     * Returns time since user stopped typing
     */
    public long getReactionTime() {
        return getCurrentTime() - mLastTypedTime;
    }

    /**
     * Returns time since url bar is focused
     */
    public long getUrlBarTime() {
        return getCurrentTime() - mUrlBarFocusedTime;
    }

    private long getCurrentTime() {
        return (long)Math.floor(System.currentTimeMillis());
    }

    public long getAppStartUpTime() {
        return getCurrentTime() - mAppStartTime;
    }

    public long getAppStopTime() {
        return mAppStopTime;
    }

    public long getOverFlowMenuUseTime() {
        return getCurrentTime() - mOverFlowMenuStartTime;
    }

    public long getAttrackTime() {
        return getCurrentTime() - mAttrackStartTime;
    }
}
