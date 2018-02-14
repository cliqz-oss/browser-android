package com.cliqz.browser.webview;

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
}
