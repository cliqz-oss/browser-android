package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Message;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.view.NestedScrollingChild2;
import androidx.core.view.NestedScrollingChildHelper;
import androidx.core.view.ViewCompat;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;

import java.lang.ref.WeakReference;
import java.util.Collections;
import java.util.Map;

import timber.log.Timber;

import static android.os.Build.VERSION.SDK_INT;
import static android.os.Build.VERSION_CODES.LOLLIPOP;
import static android.webkit.WebView.HitTestResult.IMAGE_TYPE;
import static android.webkit.WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE;

/**
 * A WebView that support nested scrolling
 *
 * @author Stefano Pacifici
 * @author Moaz Rashad
 */
@SuppressLint("ViewConstructor")
public class CliqzWebView extends WebView implements NestedScrollingChild2 {

    /**
     * Extension to the {@link WebChromeClient}
     */
    public interface CliqzChromeClient {
        void onLinkLongPressed(@NonNull WebView webView, @NonNull String url, @Nullable String imageUrl);
        void onAdjustResize(@NonNull WebView webView);
    }

    private final int[] mScrollOffset = new int[2];
    private final int[] mScrollConsumed = new int[2];
    private CliqzChromeClient mCliqzChromeClient = null;
    private final GestureDetector gestureDetector;
    private final WebViewHandler webViewHandler = new WebViewHandler(this);

    private int mLastY;
    private final NestedScrollingChildHelper mChildHelper;
    private boolean firstScroll = true;
    private int mNestedOffsetY;

    // Android 8.0 (Oreo) bug, we have to restore the client for each loadUrl request with a delay
    private static final long LOAD_URL_DELAY_SECONDS = 250L;

    public CliqzWebView(Context context) {
        super(context);
        mChildHelper = new NestedScrollingChildHelper(this);
        gestureDetector = new GestureDetector(context, new CustomGestureListener());
        setNestedScrollingEnabled(true);
    }

    @SuppressLint("ObsoleteSdkInt")
    @Override
    public void setWebChromeClient(WebChromeClient client) {
        super.setWebChromeClient(client);
        if (client instanceof CliqzChromeClient) {
            mCliqzChromeClient = (CliqzChromeClient) client;
        }
    }

    @Override
    public void bringToFront() {
        final ViewGroup container = (ViewGroup) getParent();
        //return if the view is already on top
        if (container != null &&
                container.getChildAt(container.getChildCount() - 1).getId() == getId()) {
            return;
        }
        super.bringToFront();
        if (mCliqzChromeClient != null) {
            // TODO bus.post(new Messages.AdjustResize());
            mCliqzChromeClient.onAdjustResize(this);
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            requestLayout();
        }
    }

    @Override
    public void loadUrl(final String url) {
        loadUrl(url, Collections.emptyMap());
    }

    @Override
    public void loadUrl(final String url, final Map<String, String> additionalHttpHeaders) {
        postDelayed(() -> CliqzWebView.super.loadUrl(url, additionalHttpHeaders), LOAD_URL_DELAY_SECONDS);
    }

    public void setIncognitoMode(boolean enable) {
        final WebSettings settings = getSettings();
        if (enable) {
            if (SDK_INT >= LOLLIPOP) {
                // We're in Incognito mode, reject
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
            }
            settings.setDomStorageEnabled(false);
            settings.setAppCacheEnabled(false);
            settings.setDatabaseEnabled(false);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        } else {
            if (SDK_INT >= LOLLIPOP) {
                settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
            }
            settings.setDomStorageEnabled(true);
            settings.setAppCacheEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDatabaseEnabled(true);
        }
    }

    //Below code has been taken and modified from the GitHub repo takahirom/webview-in-coordinatorlayout
    @SuppressLint("ClickableViewAccessibility")
    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        if (gestureDetector.onTouchEvent(ev)) {
            return true;
        }

        boolean returnValue = false;
        MotionEvent event = MotionEvent.obtain(ev);
        final int action = event.getAction();
        if (action == MotionEvent.ACTION_DOWN) {
            mNestedOffsetY = 0;
        }
        int eventY = (int) event.getY();
        event.offsetLocation(0, mNestedOffsetY);
        switch (action) {
            case MotionEvent.ACTION_MOVE:
                int deltaY = mLastY - eventY;
                // NestedPreScroll
                if (dispatchNestedPreScroll(0, deltaY, mScrollConsumed, mScrollOffset)) {
                    deltaY -= mScrollConsumed[1];
                    mLastY = eventY - mScrollOffset[1];
                    event.offsetLocation(0, -mScrollOffset[1]);
                    mNestedOffsetY += mScrollOffset[1];
                }
                returnValue = super.onTouchEvent(event);

                // NestedScroll
                if (dispatchNestedScroll(0, mScrollOffset[1], 0, deltaY, mScrollOffset)) {
                    event.offsetLocation(0, mScrollOffset[1]);
                    mNestedOffsetY += mScrollOffset[1];
                    mLastY -= mScrollOffset[1];
                }
                break;
            case MotionEvent.ACTION_DOWN:
                returnValue = super.onTouchEvent(event);
                if (firstScroll) {
                    // dispatching first down scrolling properly by making sure that first deltaY will be -ve
                    mLastY = eventY - 5;
                    firstScroll = false;
                } else {
                    mLastY = eventY;
                }
                // start NestedScroll
                startNestedScroll(ViewCompat.SCROLL_AXIS_VERTICAL);
                break;
            default:
                firstScroll = true;
                returnValue = super.onTouchEvent(event);
                // end NestedScroll
                stopNestedScroll();
                break;
        }
        return returnValue;
    }

    @Override
    public boolean isNestedScrollingEnabled() {
        return mChildHelper.isNestedScrollingEnabled();
    }

    // Nested Scroll implements
    @Override
    public void setNestedScrollingEnabled(boolean enabled) {
        mChildHelper.setNestedScrollingEnabled(enabled);
    }

    @Override
    public boolean startNestedScroll(int axes) {
        return mChildHelper.startNestedScroll(axes);
    }

    @Override
    public void stopNestedScroll() {
        mChildHelper.stopNestedScroll();
    }

    @Override
    public boolean hasNestedScrollingParent() {
        return mChildHelper.hasNestedScrollingParent();
    }

    @Override
    public boolean dispatchNestedScroll(int dxConsumed, int dyConsumed, int dxUnconsumed, int dyUnconsumed,
                                        int[] offsetInWindow) {
        return mChildHelper.dispatchNestedScroll(dxConsumed, dyConsumed, dxUnconsumed, dyUnconsumed, offsetInWindow);
    }

    @Override
    public boolean dispatchNestedPreScroll(int dx, int dy, int[] consumed, int[] offsetInWindow) {
        return mChildHelper.dispatchNestedPreScroll(dx, dy, consumed, offsetInWindow);
    }

    @Override
    public boolean dispatchNestedFling(float velocityX, float velocityY, boolean consumed) {
        return mChildHelper.dispatchNestedFling(velocityX, velocityY, consumed);
    }

    @Override
    public boolean dispatchNestedPreFling(float velocityX, float velocityY) {
        return mChildHelper.dispatchNestedPreFling(velocityX, velocityY);
    }

    @Override
    public boolean startNestedScroll(int axes, int type) {
        return mChildHelper.startNestedScroll(axes, type);
    }

    @Override
    public void stopNestedScroll(int type) {
        mChildHelper.stopNestedScroll(type);
    }

    @Override
    public boolean hasNestedScrollingParent(int type) {
        return mChildHelper.hasNestedScrollingParent(type);
    }

    @Override
    public boolean dispatchNestedScroll(int dxConsumed, int dyConsumed, int dxUnconsumed, int dyUnconsumed, @Nullable int[] offsetInWindow, int type) {
        return mChildHelper.dispatchNestedScroll(dxConsumed, dyConsumed, dxUnconsumed, dyUnconsumed, offsetInWindow, type);
    }

    @Override
    public boolean dispatchNestedPreScroll(int dx, int dy, @Nullable int[] consumed, @Nullable int[] offsetInWindow, int type) {
        return mChildHelper.dispatchNestedPreScroll(dx, dy, consumed, offsetInWindow, type);
    }

    private class CustomGestureListener extends GestureDetector.SimpleOnGestureListener {

        /**
         * Without this, onLongPress is not called when user is zooming using
         * two fingers, but is when using only one.
         * <p/>
         * The required behaviour is to not trigger this when the user is
         * zooming, it shouldn't matter how much fingers the user's using.
         */
        private boolean mCanTriggerLongPress = true;

        @Override
        public void onLongPress(MotionEvent e) {
            if (mCanTriggerLongPress) {
                Message msg = webViewHandler.obtainMessage();
                if (msg != null) {
                    msg.setTarget(webViewHandler);
                    requestFocusNodeHref(msg);
                }
            }
        }

        /**
         * Is called when the user is swiping after the doubletap, which in our
         * case means that he is zooming.
         */
        @Override
        public boolean onDoubleTapEvent(MotionEvent e) {
            mCanTriggerLongPress = false;
            return false;
        }

        /**
         * Is called when something is starting being pressed, always before
         * onLongPress.
         */
        @Override
        public void onShowPress(MotionEvent e) {
            mCanTriggerLongPress = true;
        }
    }

    private static class WebViewHandler extends Handler {

        private WeakReference<CliqzWebView> mReference;

        WebViewHandler(CliqzWebView view) {
            mReference = new WeakReference<>(view);
        }

        @Override
        public void handleMessage(Message msg) {
            super.handleMessage(msg);
            String url = msg.getData().getString("url");
            final CliqzWebView view = mReference.get();
            final CliqzChromeClient listener = view != null ? view.mCliqzChromeClient : null;
            if (listener != null) {
                final WebView.HitTestResult result = view.getHitTestResult();
                final String userAgent = view.getSettings().getUserAgentString();
                final int resultType = result != null ? result.getType() : HitTestResult.UNKNOWN_TYPE;
                final String imageUrl;
                if (resultType == HitTestResult.SRC_IMAGE_ANCHOR_TYPE ||
                    resultType == HitTestResult.IMAGE_TYPE) {
                    imageUrl = result.getExtra();
                } else {
                    imageUrl = null;
                }
                if (url == null && imageUrl != null) {
                    url = imageUrl;
                }
                if (url != null) {
                    listener.onLinkLongPressed(view, url, imageUrl);
                }
            }
        }
    }

}
