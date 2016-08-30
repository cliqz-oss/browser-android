package com.cliqz.antitracking.test;

import android.content.Context;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * @author Stefano Pacifici
 * @date 2016/07/13
 */
public class TestWebView extends WebView {

    private static final String TAG = TestWebView.class.getSimpleName();

    private boolean mStarted = false;

    public TestWebView(Context context) {
        super(context);
        final WebSettings settings = getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
    }
}
