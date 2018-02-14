package com.cliqz.browser.facebook;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.util.Log;

import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

/**
 * Automate Facebook init, it checks if the SDK is available and
 *
 * @author Stefano Pacifici
 */
public final class FacebookWrapper {

    private static final String TAG = FacebookWrapper.class.getSimpleName();
    private static final String FIRST_CALL_DATE_KEY = TAG + ".first_call_date";
    private static final long ONE_WEEK = 604800000L;

    private static final String FACEBOOK_SDK_CN = "com.facebook.FacebookSdk";
    private static final String APP_EVENTS_LOGGER_CN = "com.facebook.appevents.AppEventsLogger";
    private static final String APP_LINK_DATA_CN = "com.facebook.applinks.AppLinkData";
    private static final String COMPLETION_HANDLER_CN =
            "com.facebook.applinks.AppLinkData$CompletionHandler";
    private static final String SDK_INITIALIZE_MN = "sdkInitialize";
    private static final String ACTIVATE_APP_MN = "activateApp";
    private static final String FETCH_DEFERRED_APP_LINK_DATA_MN = "fetchDeferredAppLinkData";

    private static boolean mAvailable;

    private static Class mCompletionHandlerInterf = null;
    private static Method mSdkInitializeMth = null;
    private static Method mActivateAppMth = null;
    private static Method mFetchDeferredAppLinkDataMth = null;

    private FacebookWrapper() {
    } // No instances

    public static void initialize(final Application application) {
        if (!mAvailable) {
            return;
        }
        final SharedPreferences preferences =
                PreferenceManager.getDefaultSharedPreferences(application);
        final long now = System.currentTimeMillis();
        final long firstStart = preferences.getLong(FIRST_CALL_DATE_KEY, now);
        final long timespan = now - firstStart;
        if (timespan > ONE_WEEK) {
            return;
        }
        if (timespan == 0) {
            preferences.edit().putLong(FIRST_CALL_DATE_KEY, now).apply();
        }

        try {
            final FbInvocationHandler handler = new FbInvocationHandler();
            final Object interfaceProxy = Proxy.newProxyInstance(
                    mCompletionHandlerInterf.getClassLoader(),
                    new Class[]{mCompletionHandlerInterf}, handler);
            mSdkInitializeMth.invoke(null, application.getApplicationContext());
            mActivateAppMth.invoke(null, application);
            mFetchDeferredAppLinkDataMth.invoke(null, application.getApplicationContext(),
                    interfaceProxy);
        } catch (Throwable e) {
            Log.e(TAG, "Can't init Facebook SDK", e);
        }
    }

    static {
        try {
            final Class<?> mFacebookSdkCls = Class.forName(FACEBOOK_SDK_CN);
            final Class<?> mAppEventsLoggerCls =
                    Class.forName(APP_EVENTS_LOGGER_CN);
            Class<?> mAppLinkDataCls = Class.forName(APP_LINK_DATA_CN);
            final Class[] innerClasses = mAppLinkDataCls.getDeclaredClasses();
            for (Class innerClass : innerClasses) {
                if (innerClass.getName().equals(COMPLETION_HANDLER_CN)) {
                    mCompletionHandlerInterf = innerClass;
                    break;
                }
            }
            mSdkInitializeMth = mFacebookSdkCls.getMethod(SDK_INITIALIZE_MN, Context.class);
            mActivateAppMth = mAppEventsLoggerCls.getMethod(ACTIVATE_APP_MN, Application.class);
            mFetchDeferredAppLinkDataMth = mAppLinkDataCls
                    .getMethod(FETCH_DEFERRED_APP_LINK_DATA_MN,
                            Context.class, mCompletionHandlerInterf);
            mAvailable = true;
        } catch (Throwable ex) {
            mAvailable = false;
            Log.e(TAG, "Can't init Facebook SDK", ex);
        }
    }

}
