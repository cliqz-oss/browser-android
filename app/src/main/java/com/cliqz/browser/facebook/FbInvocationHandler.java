package com.cliqz.browser.facebook;

import android.net.Uri;
import android.util.Log;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

import javax.inject.Inject;

/**
 * @author Ravjit
 */

public class FbInvocationHandler implements InvocationHandler {

    private static final String TAG = FbInvocationHandler.class.getSimpleName();
    private static boolean mAvailable;
    private static Class mAppLinkDataCls = null;
    private static Method mGetTargetUriMth = null;

    @Inject
    Telemetry telemetry;

    FbInvocationHandler() {
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (!mAvailable) {
            return null;
        }
        if (method.getName().equals("onDeferredAppLinkDataFetched")) {
            if (args[0] == null) {
                return null;
            }
            //TODO: Remove this for production version, for debugging purpose in beta only
            Log.v(TAG, "method onDeferredAppLinkDataFetched called with non null args");
            final Uri uri = (Uri) mGetTargetUriMth.invoke(mAppLinkDataCls.cast(args[0]));
            if (uri != null) {
                telemetry.sendFBInstallSignal(uri.toString());
            }
        }
        return null;
    }

    static {
        try {
            mAppLinkDataCls = Class.forName("com.facebook.applinks.AppLinkData");
            mGetTargetUriMth = mAppLinkDataCls.getMethod("getTargetUri");
            mAvailable = true;
        } catch (Throwable ex) {
            mAvailable = false;
            Log.e(TAG, "Can't init Facebook SDK", ex);
        }
    }
}
