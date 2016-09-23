package com.cliqz.antitracking;

import android.annotation.TargetApi;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.utils.StreamUtils;

import org.json.JSONObject;

import javax.inject.Inject;

import acr.browser.lightning.utils.AdBlock;

/**
 * Created by sammacbeth on 22/06/16.
 */
public class AntiTracking {

    private boolean mEnabled = false;
    private boolean mAdBlockEnabled = true;

    private final AdBlock adBlock;

    @Inject
    public AntiTracking(final Context context, final Object unused) {
        adBlock = new AdBlock(context);
    }

    public boolean isEnabled() {
        return mEnabled;
    }

    public void setEnabled(boolean value) {
        this.mEnabled = value;
    }

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

    //dummy method to suppress the error
    public JSONObject getTabBlockingInfo(int i) {
        return null;
    }

    public void setAdblockEnabled(boolean value) {
        mAdBlockEnabled = value;
    }

    public boolean isAdBlockEnabled() {
        return mAdBlockEnabled;
    }
}
