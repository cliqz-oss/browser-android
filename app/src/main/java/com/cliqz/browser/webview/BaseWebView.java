package com.cliqz.browser.webview;

import android.content.Context;
import android.support.annotation.Nullable;
import android.view.MotionEvent;
import android.view.inputmethod.InputMethodManager;

import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.Telemetry;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * This class help us to create a standardized webview in which we can execute our javascript code.
 * It provide a standard way to add bridges that works with the postMessage javascript protocol.
 *
 * @author Stefano Pacifici
 * @date 2015/12/08
 */
public abstract class BaseWebView extends AbstractionWebView {
    private static final String TAG = BaseWebView.class.getSimpleName();

    private boolean mSuperSetupCalled = false;
    private boolean mJsReady = false;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    LocationCache locationCache;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    CliqzBridge bridge;

    Context context;
    private boolean isTouched = false;
    private float initialX;
    private float initialY;

    public BaseWebView(Context context) {
        super(context);
        this.context = context;
        setup();
        checkSuperSetupCalled();
    }

    private void checkSuperSetupCalled() {
        if (!mSuperSetupCalled)
            throw new RuntimeException("BaseWebView setup method should be called by children");
    }

    @Override
    protected  void setup() {
        ((MainActivity)context).mActivityComponent.inject(this);
        // Make extra sure web performance is nice on scrolling. Can this actually be harmful?
        super.setup();

        final AWVClient client = createClient();
        setClient(client);

        // Callbacks from JS to Java
        if (bridge != null) {
            addBridge(bridge, "jsBridge");
        }

        final String extensionUrl = getExtensionUrl();
        if (extensionUrl != null) {
            loadApp(extensionUrl);
        }
        mSuperSetupCalled = true;
    }

    @Nullable
    protected abstract AWVClient createClient();

    @Nullable
    protected abstract String getExtensionUrl();

    void extensionReady() {
        mJsReady = true;
    }

    public boolean isExtensionReady() { return mJsReady; }

    @Override
    public void onPause() {
        super.onPause();
        //pauseTimers();
    }

    @Override
    public void onResume() {
        super.onResume();
        //resumeTimers();
        // When created we call this twice (one here and one in extensionReady()
        // That should not be a problem
    }

    @Override
    protected void onLayout(boolean changed, int l, int t, int r, int b) {
        super.onLayout(changed, l, t, r, b);
    }

    //Have to use dispatchTouchEvent instead of onTouchListener because Xwalk doesn't fire that event.
    @Override
    public boolean dispatchTouchEvent(MotionEvent motionEvent) {
        final int mAction = motionEvent.getAction() & MotionEvent.ACTION_MASK;
        if (mAction == MotionEvent.ACTION_DOWN) {
            initialX = motionEvent.getX();
            initialY = motionEvent.getY();
            isTouched = true;
        } else if (mAction == MotionEvent.ACTION_UP) {
            isTouched = false;
            final float finalX = motionEvent.getX();
            final float finalY = motionEvent.getY();
            final float distanceX = finalX - initialX;
            final float distanceY = finalY - initialY;
            //Dismiss only for vertical scroll
            if (Math.abs(distanceY) > 50 && Math.abs(distanceX) < 100) {
                hideKeyboard();
            }
        }
        return super.dispatchTouchEvent(motionEvent);
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager)context
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(this.getWindowToken(), 0);
    }
}
