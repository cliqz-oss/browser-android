package acr.browser.lightning.view;

import android.app.Activity;
import android.os.Build;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;

import com.cliqz.browser.main.MainActivity;
import com.squareup.otto.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * General workaround container for old phones
 *
 * @author Stefano Pacifici
 * @date 2016/03/14
 */
public class CliqzWebView extends WebView {

    private static final int SCROLL_UP_THRESHOLD = 30;
    private static final int SCROLL_DOWN_THRESHOLD = -50;
    private boolean isClicked;
    private boolean isMultiFingerGesture;

    @Inject
    Bus bus;

    public CliqzWebView(Activity activity) {
        this(activity, null);
    }

    public CliqzWebView(Activity activity, AttributeSet attrs) {
        this(activity, attrs, 0);
    }

    public CliqzWebView(Activity activity, AttributeSet attrs, int defStyleAttr) {
        super(activity, attrs, defStyleAttr);
        ((MainActivity)activity).mActivityComponent.inject(this);
        this.setOnTouchListener(new TouchListener());
    }

    @Override
    protected void onScrollChanged(int newX, int newY, int oldX, int oldY) {
        super.onScrollChanged(newX, newY, oldX, oldY);
        if(newY - oldY > SCROLL_UP_THRESHOLD && isClicked && !isMultiFingerGesture) {
            bus.post(new BrowserEvents.HideToolBar());
        } else if ( newY - oldY < SCROLL_DOWN_THRESHOLD && isClicked && !isMultiFingerGesture) {
            bus.post(new BrowserEvents.ShowToolBar());
        }
        //Show toolbar if page scrolled to top
        if (newY == 0) {
            bus.post(new BrowserEvents.ShowToolBar());
        }
    }

    @Override
    public void bringToFront() {
        super.bringToFront();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            requestLayout();
        }
    }

    private class TouchListener implements OnTouchListener {

        @Override
        public boolean onTouch(View view, MotionEvent motionEvent) {
            if (view == null)
                return false;

            if (!view.hasFocus()) {
                view.requestFocus();
            }
            final int mAction = motionEvent.getAction() & MotionEvent.ACTION_MASK;
            if (mAction == MotionEvent.ACTION_DOWN) {
                isClicked = true;
            } else if (mAction == MotionEvent.ACTION_POINTER_DOWN) {
                isMultiFingerGesture = true;
            } else if (mAction == MotionEvent.ACTION_POINTER_UP && motionEvent.getPointerCount() == 2) {
                isMultiFingerGesture = false;
            } else if (mAction == MotionEvent.ACTION_UP) {
                isClicked = false;
            }
            return false;
        }
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
}
