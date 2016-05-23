package com.cliqz.browser.webview;

import android.content.Context;
import android.net.http.SslError;
import android.os.Build;
import android.util.Log;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.cliqz.browser.BuildConfig;

/**
 * @author Stefano Pacifici
 * @date 2016/01/27
 */
public class AbstractionWebView extends WebView {

    private static final String TAG = AbstractionWebView.class.getSimpleName();

    public AbstractionWebView(Context context) {
        super(context);
    }

    public void setClient(final AWVClient client) {
        setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return super.shouldOverrideUrlLoading(view, url) ||
                        client.shouldOverrideUrlLoading(getAbstractionWebView(view), url);
            }

            @Override
            public void onReceivedSslError(WebView view, final SslErrorHandler handler, SslError error) {
                client.onReceivedSslError(
                        getAbstractionWebView(view),
                        new ValueCallback<Boolean>() {
                            @Override
                            public void onReceiveValue(Boolean value) {
                                if (true) {
                                    handler.proceed();
                                } else {
                                    handler.cancel();
                                }
                            }
                        }, error);
            }

            private AbstractionWebView getAbstractionWebView(WebView view) {
                return view instanceof AbstractionWebView ? (AbstractionWebView) view : null;
            }
        });
    }

    /**
     * Load the JS App at the given url. For the standard implementation means only to proxy
     * a loadUrl to the WebView.
     *
     * @param url the url of the app to load
     */
    public void loadApp(String url) {
        loadUrl(url);
    }

    protected void setup() {
        // Web view settings
        setLayerType(View.LAYER_TYPE_HARDWARE, null);
        WebSettings webSettings = getSettings();
        webSettings.setAllowFileAccess(true);
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setGeolocationEnabled(true);
        webSettings.setGeolocationDatabasePath(getContext().getCacheDir().getAbsolutePath());

        if (Build.VERSION.SDK_INT >= 16) {
            // Otherwise we can't do XHR
            webSettings.setAllowFileAccessFromFileURLs(true);
            webSettings.setAllowUniversalAccessFromFileURLs(true);
        }

        setWebChromeClient(new WebChromeClient() {

            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d(TAG, cm.message() + " -- From line "
                        + cm.lineNumber() + " of "
                        + cm.sourceId());
                return true;
            }
        });
    }

    /**
     * Evaluate JS in web context
     * @param js JS command
     */
    protected final void executeJS(final String js) {
        if (js != null && !js.isEmpty()) {
            post(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        evaluateJavascript(js, null);
                    } else {
                        loadUrl("javascript:" + js);
                    }
                }
            });
        }
    }

    void addBridge(final Bridge bridge, final String name) {
        addJavascriptInterface(new BridgeWrapper(bridge), name);
    }

    private class BridgeWrapper {
        final Bridge bridge;

        BridgeWrapper(Bridge bridge) {
            this.bridge = bridge;
        }

        @JavascriptInterface
        public void postMessage(String message) {
            bridge.postMessage(message);
        }
    }

    static {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT && BuildConfig.DEBUG) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
