package com.cliqz.antitracking.test;

import android.support.annotation.NonNull;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public class RegularWebViewClient extends TestWebViewClient {

    public RegularWebViewClient(@NonNull MessageQueue messageQueue) {
        super(messageQueue);
    }

    @Override
    public WebResourceResponse handleRequest(WebView view, WebResourceRequest request) {
        return null;
    }

}
