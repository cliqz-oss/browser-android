package com.cliqz.antitracking;

import android.webkit.WebResourceResponse;

/**
 * @author Stefano Pacifici
 * @date 2016/08/22
 */
public class AntiTrackingResponse {

    public static final int ANTITRACKING_TYPE = 1;
    public static final int ADBLOCKING_TYPE = 2;

    public final int type;
    public final WebResourceResponse response;

    public AntiTrackingResponse(int type, WebResourceResponse response) {
        this.type = type;
        this.response = response;
    }
}
