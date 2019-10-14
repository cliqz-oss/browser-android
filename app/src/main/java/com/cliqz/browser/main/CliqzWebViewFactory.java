package com.cliqz.browser.main;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.webkit.WebSettings;

import androidx.annotation.NonNull;

import com.cliqz.browser.annotations.PerActivity;

import javax.inject.Inject;

import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.view.CliqzWebView;
import timber.log.Timber;

import static android.os.Build.VERSION.SDK_INT;
import static android.os.Build.VERSION_CODES.JELLY_BEAN;
import static android.os.Build.VERSION_CODES.JELLY_BEAN_MR1;
import static android.os.Build.VERSION_CODES.JELLY_BEAN_MR2;
import static android.os.Build.VERSION_CODES.KITKAT;

@PerActivity
public final class CliqzWebViewFactory {

    private static final int MAX_RETRIES = 5;
    private static final long RETRY_DELAY = 1000L; // one second

    private final Activity context;
    private final MainThreadHandler handler;

    @Inject
    CliqzWebViewFactory(@NonNull Activity context,
                        @NonNull MainThreadHandler handler) {
        this.context = context;
        this.handler = handler;
    }

    /**
     * Create a CliqzWebView and return it through the given callback
     *
     * @param callback the callback
     */
    public void createWebView(@NonNull Callback callback) {
        createWithRetries(callback, 0);
    }

    private CliqzWebView createWebView() {
        final CliqzWebView cliqzWebView = new CliqzWebView(context);
        cliqzWebView.setDrawingCacheBackgroundColor(Color.WHITE);
        cliqzWebView.setFocusableInTouchMode(true);
        cliqzWebView.setFocusable(true);
        cliqzWebView.setDrawingCacheEnabled(false);
        cliqzWebView.setWillNotCacheDrawing(true);

        if (SDK_INT <= Build.VERSION_CODES.LOLLIPOP_MR1) {
            cliqzWebView.setAnimationCacheEnabled(false);
            cliqzWebView.setAlwaysDrawnWithCacheEnabled(false);
        }
        cliqzWebView.setBackgroundColor(Color.WHITE);

        cliqzWebView.setSaveEnabled(true);
        cliqzWebView.setNetworkAvailable(true);
        cliqzWebView.setDownloadListener(new LightningDownloadListener(context));
        final WebSettings settings = cliqzWebView.getSettings();
        if (SDK_INT < JELLY_BEAN_MR2) {
            //noinspection deprecation
            settings.setAppCacheMaxSize(Long.MAX_VALUE);
        }
        if (SDK_INT < JELLY_BEAN_MR1) {
            //noinspection deprecation
            settings.setEnableSmoothTransition(true);
        }
        if (SDK_INT > JELLY_BEAN) {
            settings.setMediaPlaybackRequiresUserGesture(true);
        }
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setDefaultTextEncodingName("utf-8");
        // setAccessFromUrl(urlView, settings);
        if (SDK_INT >= JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        settings.setAppCachePath(context.getDir("appcache", 0).getPath());
        settings.setGeolocationDatabasePath(context.getDir("geolocation", 0).getPath());
        if (SDK_INT < KITKAT) {
            //noinspection deprecation
            settings.setDatabasePath(context.getDir("databases", 0).getPath());
        }
        return cliqzWebView;
    }

    private void createWithRetries(Callback callback, int counter) {
        if (counter >= MAX_RETRIES) {
            throw new RuntimeException("CliqzWebView creation failed");
        }

        try {
            callback.onCreated(createWebView());
        } catch (Throwable t) {
            Timber.w(t, "WebView creation failed %d times", counter + 1);
            handler.postDelayed(() -> createWithRetries(callback, counter + 1), RETRY_DELAY);
        }
    }

    public interface Callback {
        void onCreated(@NonNull CliqzWebView webView);
    }
}
