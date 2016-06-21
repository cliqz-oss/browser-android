package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Message;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.webkit.WebView;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.utils.Utils;

/**
 * Touches handler for the {@link LightningView}, directly extracted from it
 *
 * @author Stefano Pacifici
 * @date 2016/05/20
 */
class LightningViewTouchHandler {

    private static final int SCROLL_UP_THRESHOLD = Utils.dpToPx(10);

    private final LightningView lightningView;
    private final GestureDetector gestureDetector;
    private final float maxFling;
    private float mLightningViewScrollPositionY;

    private LightningViewTouchHandler(LightningView lightningView) {
        this.lightningView = lightningView;
        final WebView webView = lightningView.getWebView();
        final Context context = webView.getContext();
        webView.setOnTouchListener(new TouchListener());
        gestureDetector = new GestureDetector(context, new CustomGestureListener());
        maxFling = ViewConfiguration.get(context).getScaledMaximumFlingVelocity();
    }

    static void attachTouchListener(LightningView lightningView) {
        new LightningViewTouchHandler(lightningView);
    }

    private class TouchListener implements View.OnTouchListener {

        float mLocation;
        float mY;
        int mAction;

        @SuppressLint("ClickableViewAccessibility")
        @Override
        public boolean onTouch(View view, MotionEvent motionEvent) {
            if (view == null)
                return false;

            if (!view.hasFocus()) {
                view.requestFocus();
            }
            mAction = motionEvent.getAction() & MotionEvent.ACTION_MASK;
            mY = motionEvent.getY();
            if (mAction == MotionEvent.ACTION_DOWN) {
                mLocation = mY;
                mLightningViewScrollPositionY = ((WebView) view).getScrollY();
                lightningView.clicked = true;
            } else if (mAction == MotionEvent.ACTION_POINTER_UP && motionEvent.getPointerCount() == 2) {
                int pointerIndex = motionEvent.getActionIndex(); //index of the finger lifted
                int lastPointerIndex = pointerIndex ^ 1; //index of the last finger, it is always 0 or 1
                mLocation = motionEvent.getY(lastPointerIndex); //update the current location of the finger
            } else if (mAction == MotionEvent.ACTION_UP) {
                final float distance = (mY - mLocation);
                final float scrollY = view.getScrollY();
                // Do not perform the following actions if the webview didn't scroll vertically
                if (distance > SCROLL_UP_THRESHOLD && scrollY < SCROLL_UP_THRESHOLD &&
                        mLightningViewScrollPositionY != scrollY) {
                    lightningView.mEventBus.post(new BrowserEvents.ShowToolBar());
                } else if (distance < -SCROLL_UP_THRESHOLD &&
                        mLightningViewScrollPositionY != scrollY) {
                    lightningView.mEventBus.post(new BrowserEvents.HideToolBar());
                }
                mLocation = 0;
            }
            gestureDetector.onTouchEvent(motionEvent);
            return false;
        }
    }

    private class CustomGestureListener extends GestureDetector.SimpleOnGestureListener {

        @Override
        public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
            final float webViewScrollPositionY = lightningView.getWebView().getScrollY();

            int power = (int) (velocityY * 100 / maxFling);
            // Do not perform the following actions if the webview didn't scroll vertically
            if (power < -10 && mLightningViewScrollPositionY != webViewScrollPositionY) {
                lightningView.mEventBus.post(new BrowserEvents.HideToolBar());
            } else if (power > 15 && mLightningViewScrollPositionY != webViewScrollPositionY) {
                lightningView.mEventBus.post(new BrowserEvents.ShowToolBar());
            }
            return super.onFling(e1, e2, velocityX, velocityY);
        }

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
                Message msg = lightningView.webViewHandler.obtainMessage();
                if (msg != null) {
                    msg.setTarget(lightningView.webViewHandler);
                    lightningView.getWebView().requestFocusNodeHref(msg);
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

}
