package com.cliqz.antitracking.test;

import android.content.Context;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.Engine;
import com.cliqz.jsengine.v8.JSApiException;

import org.json.JSONObject;

import java.util.concurrent.ExecutionException;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public class AntiTrackingWebViewClient extends TestWebViewClient {

    private static final String TAG = AntiTrackingWebViewClient.class.getSimpleName();

    private final Engine engine;
    private final AntiTracking antiTracking;

    public AntiTrackingWebViewClient(MessageQueue messageQueue, Context context) {
        super(messageQueue);
        try {
            engine = new Engine(context, true);
            antiTracking = new AntiTracking(engine);
            engine.startup(antiTracking.getDefaultPrefs());
            antiTracking.setEnabled(true);
            antiTracking.setForceBlockEnabled(true);
        } catch(JSApiException | ExecutionException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public WebResourceResponse handleRequest(WebView view, WebResourceRequest request) {
        return engine.webRequest.shouldInterceptRequest(view, request);
    }
}
