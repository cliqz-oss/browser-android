package com.cliqz.antitracking.test;

import android.graphics.Bitmap;
import android.support.annotation.NonNull;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.cliqz.antitracking.AntiTracking;
import com.cliqz.antitracking.AntiTrackingResponse;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public abstract class TestWebViewClient extends WebViewClient {

    private static final String TAG = TestWebViewClient.class.getSimpleName();
    private final MessageQueue messageQueue;

    public TestWebViewClient(@NonNull MessageQueue messageQueue) {
        super();
        this.messageQueue = messageQueue;
    }


    @Override
    public final WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        final String url = request.getUrl().toString();
        final AntiTrackingResponse response = handleRequest(view, request);
        if (response.response == null) {
            messageQueue.onNewUrl(url);
        } else {
            messageQueue.onNewBlockedUrl(url);
        }
        return response.response;
    }

    public abstract AntiTrackingResponse handleRequest(WebView view, WebResourceRequest request);

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        super.onPageStarted(view, url, favicon);
        messageQueue.onPageStarted(url, System.currentTimeMillis());
    }

    @Override
    public void onPageFinished(WebView view, String url) {
        messageQueue.onPageFinished(url, System.currentTimeMillis());
        super.onPageFinished(view, url);
    }
}
