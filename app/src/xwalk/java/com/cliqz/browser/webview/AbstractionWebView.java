package com.cliqz.browser.webview;

import android.content.Context;
import android.net.http.SslError;
import android.os.Build;
import android.util.Log;
import android.webkit.ValueCallback;

import org.xwalk.core.JavascriptInterface;
import org.xwalk.core.XWalkPreferences;
import org.xwalk.core.XWalkResourceClient;
import org.xwalk.core.XWalkUIClient;
import org.xwalk.core.XWalkView;
import org.xwalk.core.internal.XWalkSettings;

import com.cliqz.browser.BuildConfig;

/**
 * @author Stefano Pacifici
 * @date 2016/01/27
 */
public class AbstractionWebView extends XWalkView {

    private static final String TAG = AbstractionWebView.class.getSimpleName();

    public AbstractionWebView(Context context) {
        super(context);
    }

    /**
     * Load the JS App at the given url. For the XWalk implementation means to call
     * loadAppFromManifest(...).
     *
     * @param url the url of the app to load
     */
    public void loadApp(String url) {
        loadAppFromManifest(url, null);
    }

    public void loadUrl(String url) {
        load(url, null);
    }

    public void onPause() {
    }

    public void onResume() {
    }

    public void setClient(final AWVClient client) {
        if (client == null) {
            setResourceClient(new XWalkResourceClient(this));
        } else {
            setResourceClient(new XWalkResourceClient(this) {
                @Override
                public boolean shouldOverrideUrlLoading(XWalkView view, String url) {
                    return super.shouldOverrideUrlLoading(view, url) ||
                            client.shouldOverrideUrlLoading(AbstractionWebView.this, url);
                }

                @Override
                public void onLoadFinished(XWalkView view, String url) {
                    super.onLoadFinished(view, url);
                    client.onPageFinished(AbstractionWebView.this, url);
                }

                @Override
                public void onReceivedSslError(XWalkView view, ValueCallback<Boolean> callback, SslError error) {
                    // Do not call super here!
                    // super.onReceivedSslError(view, callback, error);
                    client.onReceivedSslError(AbstractionWebView.this , callback, error);
                }
            });
        }
    }

    protected void setup() {
        setUIClient(new XWalkUIClient(this) {
            @Override
            public boolean onConsoleMessage(XWalkView view, String message, int lineNumber, String sourceId, ConsoleMessageType messageType) {
                Log.d(TAG, message + " -- From line "
                        + lineNumber + " of "
                        + sourceId);
                return true;
            }
        });
    }

    void addBridge(Bridge bridge, String name) {
        addJavascriptInterface(new BridgeWrapper(bridge), name);
    }

    @Override
    public void bringToFront() {
        super.bringToFront();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            requestLayout();
        }
    }

    public void executeJS(String script) {
        evaluateJavascript(script, null);
    }

    private class BridgeWrapper {
        private final Bridge bridge;

        BridgeWrapper(Bridge bridge) {
            this.bridge = bridge;
        }

        @JavascriptInterface
        public void postMessage(String message) {
            bridge.postMessage(message);
        }
    }

    static {
        if (BuildConfig.DEBUG) {
            XWalkPreferences.setValue(XWalkPreferences.REMOTE_DEBUGGING, true);
            XWalkPreferences.setValue(XWalkPreferences.ALLOW_UNIVERSAL_ACCESS_FROM_FILE, true);
        }
    }
}
