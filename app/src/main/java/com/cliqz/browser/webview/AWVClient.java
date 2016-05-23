package com.cliqz.browser.webview;

import android.net.http.SslError;
import android.webkit.ValueCallback;

/**
 * @author Stefano Pacifici
 * @date 2016/01/27
 */
public class AWVClient {
    public boolean shouldOverrideUrlLoading(AbstractionWebView wv, final String url) {
        return false;
    };

    public void onPageFinished(AbstractionWebView view, String url) {
        // Nothing to do here
    }

    /**
     * Handle SSL errors generetad from the {@link AbstractionWebView}
     *
     * @param view the {@link AbstractionWebView} that generated the SSL error
     * @param callback A {@link ValueCallback}, must be called with false if we should stop loading,
     *                 with true otherwise
     * @param error the {@link SslError}
     */
    public void onReceivedSslError(AbstractionWebView view, ValueCallback<Boolean> callback, SslError error) {
        // Replicate the default behavior
        callback.onReceiveValue(false);
    }

}
