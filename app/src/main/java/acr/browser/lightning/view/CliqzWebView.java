package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Message;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.annotation.Nullable;
import androidx.core.view.NestedScrollingChild2;
import androidx.core.view.NestedScrollingChildHelper;
import androidx.core.view.ViewCompat;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;

import java.lang.ref.WeakReference;
import java.util.Collections;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.dialog.LightningDialogBuilder;
import timber.log.Timber;

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
    private final int[] mScrollOffset = new int[2];
    private final int[] mScrollConsumed = new int[2];
    private final GestureDetector gestureDetector;
    private final WebViewHandler webViewHandler = new WebViewHandler(this);

    @Inject
    Bus bus;

    @Inject
    LightningDialogBuilder dialogBuilder;

    private int mLastY;
    private final NestedScrollingChildHelper mChildHelper;
    private boolean firstScroll = true;
    private int mNestedOffsetY;

    // Android 8.0 (Oreo) bug, we have to restore the client for each loadUrl request with a delay
    private static final long LOAD_URL_DELAY_SECONDS = 250L;

    public CliqzWebView(Context context) {
        super(context);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }

        // Disable saving the WebView state as we manage saving the state via the WebViewPersister,
        // this also mitigate crashes due to TransactionTooLargeException.
        setSaveEnabled(false);
        mChildHelper = new NestedScrollingChildHelper(this);
        gestureDetector = new GestureDetector(context, new CustomGestureListener());
        setNestedScrollingEnabled(true);
    }

    @SuppressLint("ObsoleteSdkInt")
    @Override
    public void bringToFront() {
        final ViewGroup container = (ViewGroup) getParent();
        //return if the view is already on top
        if (container != null &&
                container.getChildAt(container.getChildCount() - 1).getId() == getId()) {
            return;
        }
        super.bringToFront();
        bus.post(new Messages.AdjustResize());
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

    /**
     * handles a long click on the page, parameter String urlView
     * is the urlView that should have been obtained from the WebView touch node
     * thingy, if it is null, this method tries to deal with it and find a workaround
     */
    private void longClickPage(final String url) {
        HitTestResult result;
        try {
            result = getHitTestResult();
        } catch (Throwable e) {
            // Bug in WebViewChromium
            Timber.e(e, "Error getting hit test result from the WebView");
            result = null;
        }
        final String userAgent = getSettings().getUserAgentString();
        if (url != null) {
            if (result != null) {
                final String imageUrl = result.getExtra();
                final int resultType = result.getType();
                if ((resultType == SRC_IMAGE_ANCHOR_TYPE && imageUrl != null) ||
                        (resultType == IMAGE_TYPE && imageUrl != null)) {
                    dialogBuilder.showLongPressImageDialog(url, imageUrl, userAgent);
                } else {
                    dialogBuilder.showLongPressLinkDialog(url, userAgent);
                }
            } else {
                dialogBuilder.showLongPressLinkDialog(url, userAgent);
            }
        } else if (result != null && result.getExtra() != null) {
            final String newUrl = result.getExtra();
            if (result.getType() == SRC_IMAGE_ANCHOR_TYPE || result.getType() == IMAGE_TYPE) {
                dialogBuilder.showLongPressImageDialog(null, newUrl, userAgent);
            } else {
                dialogBuilder.showLongPressLinkDialog(newUrl, userAgent);
            }
        }
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
            final String url = msg.getData().getString("url");
            CliqzWebView view = mReference.get();
            if (view != null) {
                view.longClickPage(url);
            }
        }
    }

}
