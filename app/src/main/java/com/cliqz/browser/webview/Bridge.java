package com.cliqz.browser.webview;

import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import org.json.JSONException;
import org.json.JSONObject;

import timber.log.Timber;

/**
 * @author Stefano Pacifici
 */
public abstract class Bridge {

    private final Handler handler;

    private AbstractionWebView webView;

    protected Bridge() {
        this.handler = new Handler(Looper.getMainLooper());
    }

    protected abstract void inject(Context context);

    public interface IAction {
        void execute(Bridge bridge, Object data, String callback);
    }

    public void setWebView(AbstractionWebView baseWebView) {
        this.webView = baseWebView;
    }

    protected abstract  IAction safeValueOf(@NonNull String name);

    protected abstract boolean checkCapabilities();

    AbstractionWebView getWebView() {
        return webView;
    }

    public final void postMessage(String message) {
        if (!checkCapabilities()) {
            Timber.w("Not enough capabilities to execute");
            return;
        }
        try {
            final JSONObject msg = new JSONObject(message);
            final String actionName = msg.optString("action", "none");
            final Object data = msg.opt("data");
            final String callback = msg.optString("callback");
            final IAction action = safeValueOf(actionName);
            handler.post(new Runnable() {
                @Override
                public void run() {
                    action.execute(Bridge.this, data, callback);
                }
            });
        } catch (JSONException e) {
            Timber.w("Can't parse message");
        }
    }

    /**
     * Build and execute a callback without any synchronization (the callback will be immediately
     * executed). <strong>This is expecially designed for callbacks from native side APIs, do not
     * use this to call JavaScript side APIs</strong>
     *
     * @param callback callback name
     * @param args arguments to be provided to the callback
     */
    protected final void executeJavascriptCallback(String callback, Object... args) {
        if (callback == null || callback.isEmpty()) {
            throw new RuntimeException("Null or empty callback provided");
        }

        final StringBuilder builder = new StringBuilder(callback);
        builder.append('(');
        String divider = "";
        if (args != null) {
            for (Object arg: args) {
                builder.append(divider);
                if (arg instanceof String) {
                    builder.append('"').append((String) arg).append('"');
                } else if (arg instanceof Integer) {
                    builder.append((int) arg);
                } else {
                    builder.append(arg.toString());
                }
                divider = ",";
            }
        }
        builder.append(')');
        executeJavascriptOnMainThread(builder.toString());
    }

    protected final void executeJavascriptOnMainThread(@NonNull final String script) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    webView.evaluateJavascript(script, null);
                }else{
                    webView.loadUrl(script);
                }

            }
        });
    }
}
