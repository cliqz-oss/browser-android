package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.os.Message;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;

/**
 * Touches handler for the {@link LightningView}, directly extracted from it
 *
 * @author Stefano Pacifici
 */
class LightningViewTouchHandler {

    private final LightningView lightningView;
    private final GestureDetector gestureDetector;

    private LightningViewTouchHandler(LightningView lightningView) {
        this.lightningView = lightningView;
        final CliqzWebView webView = lightningView.getWebView();
//        if (webView != null) {
//            webView.setOnTouchListener(new TouchListener());
//        }
        gestureDetector = new GestureDetector(lightningView.activity, new CustomGestureListener());
    }

    static void attachTouchListener(LightningView lightningView) {
        new LightningViewTouchHandler(lightningView);
    }

    private class TouchListener implements View.OnTouchListener {
        
        @SuppressLint("ClickableViewAccessibility")
        @Override
        public boolean onTouch(View view, MotionEvent motionEvent) {
            gestureDetector.onTouchEvent(motionEvent);
            return false;
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
                Message msg = lightningView.webViewHandler.obtainMessage();
                final CliqzWebView webView = lightningView.getWebView();
                if (msg != null && webView != null) {
                    msg.setTarget(lightningView.webViewHandler);
                    // TODO webView.requestFocusNodeHref(msg);
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
