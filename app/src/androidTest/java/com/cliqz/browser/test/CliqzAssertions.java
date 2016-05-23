package com.cliqz.browser.test;

import android.webkit.WebView;

/**
 * Created by Ravjit on 22/01/16.
 */
public class CliqzAssertions {
    private CliqzAssertions() {}

    public static final void assertWebViewUrlContains(final WebView webView, final String str) throws Throwable {
        new AssertionHelper(new Runnable() {
            @Override
            public void run() {
                if(!webView.getUrl().contains(str)) {
                    throw new AssertionError("Could not assert webview url. WebView Url: " +
                            webView.getUrl() + ". Expected Key word in Url: " + str);
                }
            }
        }).apply();
    }
}
