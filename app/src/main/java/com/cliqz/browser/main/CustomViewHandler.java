package com.cliqz.browser.main;

import android.media.MediaPlayer;
import android.support.v4.content.ContextCompat;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient.CustomViewCallback;
import android.widget.FrameLayout;
import android.widget.VideoView;

/**
 * Based on code from Lightning Browser. This class must be used only from {@link MainActivity}.
 *
 * @author Stefano Pacifici
 * @date 2016/03/04
 */
class CustomViewHandler {

    private static final String TAG = CustomViewHandler.class.getSimpleName();
    private static final LayoutParams COVER_SCREEN_PARAMS = new LayoutParams(
            LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT);

    private final View customView;
    private final CustomViewCallback callback;
    private final MainActivity activity;

    private FrameLayout mFullscreenContainer = null;
    private VideoView mVideoView = null;

    CustomViewHandler(final MainActivity activity,
                      final View view,
                      final CustomViewCallback callback) {
        this.activity = activity;
        this.customView = view;
        this.callback = callback;
    }

    void showCustomView() {
        // final LightningView currentTab = mTabsManager.getCurrentTab();
        if (customView == null) {
            if (callback != null) {
                try {
                    callback.onCustomViewHidden();
                } catch (Exception e) {
                    Log.e(TAG, "Error hiding custom view", e);
                }
            }
            return;
        }
        try {
            customView.setKeepScreenOn(true);
        } catch (SecurityException e) {
            Log.e(TAG, "WebView is not allowed to keep the screen on");
        }

        // setRequestedOrientation(requestedOrientation);
        final FrameLayout decorView = (FrameLayout) activity.getWindow().getDecorView();

        mFullscreenContainer = new FrameLayout(activity);
        mFullscreenContainer.setBackgroundColor(ContextCompat.getColor(activity, android.R.color.black));
        setupVideoView(customView);
        decorView.addView(mFullscreenContainer, COVER_SCREEN_PARAMS);
        mFullscreenContainer.addView(customView, COVER_SCREEN_PARAMS);
        decorView.requestLayout();
        setFullscreen(true);
    }

    public void onHideCustomView() {
        if (customView == null || callback == null /* || currentTab == null */) {
            if (callback != null) {
                try {
                    callback.onCustomViewHidden();
                } catch (Exception e) {
                    Log.e(TAG, "Error hiding custom view", e);
                }
            }
            return;
        }
        Log.d(TAG, "onHideCustomView");
        // currentTab.setVisibility(View.VISIBLE);
        try {
            customView.setKeepScreenOn(false);
        } catch (SecurityException e) {
            Log.e(TAG, "WebView is not allowed to keep the screen on", e);
        }
        setFullscreen(false);
        if (mFullscreenContainer != null) {
            ViewGroup parent = (ViewGroup) mFullscreenContainer.getParent();
            if (parent != null) {
                parent.removeView(mFullscreenContainer);
            }
            mFullscreenContainer.removeAllViews();
        }

        mFullscreenContainer = null;
        if (mVideoView != null) {
            Log.d(TAG, "VideoView is being stopped");
            mVideoView.stopPlayback();
            mVideoView.setOnErrorListener(null);
            mVideoView.setOnCompletionListener(null);
        }
        if (callback != null) {
            try {
                callback.onCustomViewHidden();
            } catch (Exception e) {
                Log.e(TAG, "Error hiding custom view", e);
            }
        }
    }

    private void setupVideoView(final View view) {
        try {
            mVideoView = findVideoView(view);
            if (mVideoView == null) {
                return;
            }
            mVideoView.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override
                public boolean onError(MediaPlayer mp, int what, int extra) {
                    return false;
                }
            });
            mVideoView.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override
                public void onCompletion(MediaPlayer mp) {
                    onHideCustomView();
                }
            });
        } catch (ClassCastException e) {
            Log.i(TAG, "Can't find any VideoView");
        }
    }

    private VideoView findVideoView(final View view) {
        try {
            return VideoView.class.cast(view);
        } catch (ClassCastException e) {
            final FrameLayout frameLayout = FrameLayout.class.cast(view);
            return findVideoView(frameLayout.getFocusedChild());
        }
    }

    private void setFullscreen(boolean enabled) {
        Window window = activity.getWindow();
        View decor = window.getDecorView();
        if (enabled) {
            window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                    WindowManager.LayoutParams.FLAG_FULLSCREEN);
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN);
            decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        }
    }
}
