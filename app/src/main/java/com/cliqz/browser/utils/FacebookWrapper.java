package com.cliqz.browser.utils;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;
import android.util.Log;

import java.lang.reflect.Method;

/**
 * Automate Facebook init, it checks if the SDK is available and
 *
 * @author Stefano Pacifici
 * @date 2016/11/15
 */
public final class FacebookWrapper {

    private static final String TAG = FacebookWrapper.class.getSimpleName();
    private static final String FIRST_CALL_DATE_KEY = TAG + ".first_call_date";
    private static final long ONE_WEEK = 604800000l;
    private static boolean mAvailable;

    private static Class mFacebookSdkCls = null;
    private static Class mAppEventsLogger = null;
    private static Method mSdkInitialize = null;
    private static Method mActivateApp = null;

    private FacebookWrapper() {} // No instances

    public static void initialize(Application application) {
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
            mSdkInitialize.invoke(null, application.getApplicationContext());
            mActivateApp.invoke(null, application);
        } catch (Throwable e) {
            Log.v(TAG, "Can't init Facebook SDK", e);
        }
    }

    static {
        try {
            mFacebookSdkCls = Class.forName("com.facebook.FacebookSdk");
            mAppEventsLogger = Class.forName("com.facebook.appevents.AppEventsLogger");
            mSdkInitialize = mFacebookSdkCls.getMethod("sdkInitialize", Context.class);
            mActivateApp = mAppEventsLogger.getMethod("activateApp", Application.class);

            mAvailable = true;
        } catch (Throwable ex) {
            mAvailable = false;
        }
    }
}
