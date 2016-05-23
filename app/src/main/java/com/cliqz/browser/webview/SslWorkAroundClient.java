package com.cliqz.browser.webview;

import android.net.http.SslError;
import android.webkit.ValueCallback;

/**
 * @author Stefano Pacifici
 * @date 2016/04/01
 */
public class SslWorkAroundClient extends AWVClient {

    @Override
    public void onReceivedSslError(AbstractionWebView view, ValueCallback<Boolean> callback, SslError error) {
        // Force to continue loading requests.
        // TODO: Should we discriminate between requests to cliqz and others?
        callback.onReceiveValue(true);
    }
}
