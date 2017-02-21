package com.cliqz.jsengine;

import android.annotation.TargetApi;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.utils.StreamUtils;

import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import acr.browser.lightning.utils.AdBlock;

/**
 * Created by sammacbeth on 09/12/2016.
 */

public class Engine {

    boolean mEnabled = false;
    boolean mAdBlockEnabled = true;

    public class WebRequest {
        @TargetApi(Build.VERSION_CODES.LOLLIPOP)
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            return shouldInterceptRequest(view, request.getUrl());
        }

        public WebResourceResponse shouldInterceptRequest(final WebView view, Uri uri) {
            if (mAdBlockEnabled && adBlock.isAd(uri)) {
                return new WebResourceResponse("text/html", "UTF-8", StreamUtils.createEmptyStream());
            }
            return null;
        }
    }

    public WebRequest webRequest = new WebRequest();
    private final AdBlock adBlock;

    public Engine(final Context context, boolean b) {
        this.adBlock = new AdBlock(context);
    }

    public static Map<String, Object> getDebugPrefs() {
        return Collections.emptyMap();
    }

    public void startup(Map<String, Object> prefs) throws ExecutionException {

    }

    public void setLoggingEnabled(boolean e) {

    }

    public void setPref(String pref, Object value) {}
}
