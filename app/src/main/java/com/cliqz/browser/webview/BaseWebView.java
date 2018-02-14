package com.cliqz.browser.webview;

import android.content.Context;
import android.support.annotation.Nullable;
import android.view.MotionEvent;
import android.view.inputmethod.InputMethodManager;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * This class help us to create a standardized webview in which we can execute our javascript code.
 * It provide a standard way to add bridges that works with the postMessage javascript protocol.
 *
 * @author Stefano Pacifici
 */
public abstract class BaseWebView extends AbstractionWebView {

    private boolean mSuperSetupCalled = false;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    LocationCache locationCache;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    Bus bus;

    @Inject
    SubscriptionsManager subscriptionsManager;

    private CliqzBridge bridge;

    Context context;
    private float initialX;
    private float initialY;

    public BaseWebView(Context context) {
        super(context);
        this.context = context;
        setup();
        checkSuperSetupCalled();
    }

    public final CliqzBridge getBridge() {
        return bridge;
    }

    private void checkSuperSetupCalled() {
        if (!mSuperSetupCalled)
            throw new RuntimeException("BaseWebView setup method should be called by children");
    }

    @Override
    protected  void setup() {
        final MainActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        bridge = new CliqzBridge(this, bus, historyDatabase, subscriptionsManager, telemetry,
                preferenceManager);
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

    @Override
    public void onPause() {
        super.onPause();
        //pauseTimers();
    }

    @Override
    public void onResume() {
        super.onResume();
        //resumeTimers();
        // When created we call this twice (one here and one in isExtensionReady()
        // That should not be a problem
    }

    //Have to use dispatchTouchEvent instead of onTouchListener because Xwalk doesn't fire that event.
    @Override
    public boolean dispatchTouchEvent(MotionEvent motionEvent) {
        final int mAction = motionEvent.getAction() & MotionEvent.ACTION_MASK;
        if (mAction == MotionEvent.ACTION_DOWN) {
            initialX = motionEvent.getX();
            initialY = motionEvent.getY();
        } else if (mAction == MotionEvent.ACTION_UP) {
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

    /**
     * Should be called whenever the Cliqz related webViews become visible
     */
    public void isVisible() {
        notifyEvent(ExtensionEvents.CLIQZ_EVENT_SHOW);
    }

    public void notifyEvent(String event, Object... params) {
        final Object[] p = new Object[params.length+1];
        System.arraycopy(params, 0, p, 1, params.length);
        p[0] = event;
        bridge.executeJavascriptFunction(null, "CliqzEvents.pub", p);
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager)context
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(this.getWindowToken(), 0);
    }
}
