package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import androidx.core.view.MotionEventCompat;
import androidx.core.view.NestedScrollingChild;
import androidx.core.view.NestedScrollingChildHelper;
import androidx.core.view.ViewCompat;
import android.view.MotionEvent;
import android.view.ViewGroup;
import android.webkit.WebView;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;

import java.util.Collections;
import java.util.Map;

import javax.inject.Inject;

/**
 * General workaround container for old phones
 *
 * @author Stefano Pacifici
 * @author Moaz Rashad
 */
@SuppressLint("ViewConstructor")
public class CliqzWebView extends WebView implements NestedScrollingChild {
    private final int[] mScrollOffset = new int[2];
    private final int[] mScrollConsumed = new int[2];
    @Inject
    Bus bus;
    private int mLastY;
    private NestedScrollingChildHelper mChildHelper;
    private boolean firstScroll = true;
    private int mNestedOffsetY;

    // Android 8.0 (Oreo) bug, we have to restore the client for each loadUrl request with a delay
    private static final long LOAD_URL_DELAY_SECONDS = 250L;

    public CliqzWebView(Activity activity) {
        super(activity);
        final MainActivityComponent component = BrowserApp.getActivityComponent(activity);
        if (component != null) {
            component.inject(this);
        }
        mChildHelper = new NestedScrollingChildHelper(this);
        setNestedScrollingEnabled(true);
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
        bus.post(new Messages.AdjustResize());
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            requestLayout();
        }
    }

    @Override
    public void loadUrl(final String url) {
        loadUrl(url, Collections.<String, String>emptyMap());
    }

    @Override
    public void loadUrl(final String url, final Map<String, String> additionalHttpHeaders) {
        postDelayed(new Runnable() {
            @Override
            public void run() {
                CliqzWebView.super.loadUrl(url, additionalHttpHeaders);
            }
        }, LOAD_URL_DELAY_SECONDS);
    }

    protected final void executeJS(final String js) {
        if (js != null && !js.isEmpty()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                this.evaluateJavascript(js, null);
            } else {
                this.loadUrl("javascript:" + js);
            }
        }
    }

    //Below code has been taken and modified from the GitHub repo takahirom/webview-in-coordinatorlayout
    @Override
    public boolean onTouchEvent(MotionEvent ev) {
        boolean returnValue;
        //In case of GoogleMaps or other similar content ScrollX and ScrollY is always zero
        //So we have to stop nested scrolling on those pages
        if (getScrollY() == 0 && getScrollX() == 0) {
            stopNestedScroll();
        } else {
            startNestedScroll(ViewCompat.SCROLL_AXIS_VERTICAL);
        }
        MotionEvent event = MotionEvent.obtain(ev);
        final int action = MotionEventCompat.getActionMasked(event);
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
                break;
            default:
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
}
