package com.cliqz.antitracking.test;

import android.content.Context;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.antitracking.AntiTracking;
import com.cliqz.antitracking.AntiTrackingSupport;

import org.json.JSONObject;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public class AntiTrackingWebViewClient extends TestWebViewClient {

    private static final String TAG = AntiTrackingWebViewClient.class.getSimpleName();

    private final AntiTracking antiTracking;

    public AntiTrackingWebViewClient(MessageQueue messageQueue, Context context) {
        super(messageQueue);
        antiTracking = new AntiTracking(context, new AntiTrackingSupport() {
            @Override
            public void sendSignal(JSONObject obj) {
                Log.i(TAG, obj.toString());
            }

            @Override
            public boolean isAntiTrackTestEnabled() {
                return true;
            }

            @Override
            public boolean isForceBlockEnabled() {
                return true;
            }

            @Override
            public boolean isBloomFilterEnabled() {
                return true;
            }

            @Override
            public String getDefaultAction() {
                return "placeholder";
            }
        });
        antiTracking.setEnabled(true);
    }

    @Override
    public WebResourceResponse handleRequest(WebView view, WebResourceRequest request) {
        return antiTracking.shouldInterceptRequest(view, request);
    }
}
