package com.cliqz.antitracking;

import org.json.JSONObject;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public interface AntiTrackingSupport {
    void sendSignal(JSONObject obj);

    boolean isAntiTrackTestEnabled();

    boolean isForceBlockEnabled();

    boolean isBloomFilterEnabled();

    String getDefaultAction(); // placeholder
}
