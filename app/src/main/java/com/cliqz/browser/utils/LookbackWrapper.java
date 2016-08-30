package com.cliqz.browser.utils;

import android.app.Application;
import android.content.Context;
import android.util.Log;

import com.cliqz.browser.BuildConfig;

import java.lang.reflect.Method;

/**
 * @author Stefano Pacifici
 * @date 2016/07/01
 */
public class LookbackWrapper {

    private static final String TAG = LookbackWrapper.class.getSimpleName();

    private static Class sLookbackClazz = null;
    private static Method sInitMethod = null;
    private static Method sShowMethod = null;
    private static Method sStopRecording = null;

    public static void init(Application application) {
        invoke(sInitMethod, application, BuildConfig.LOOKBACK_SDK_TOKEN);
    }

    public static void show(Context context, String userId) {
        invoke(sShowMethod, context, userId);
    }

    public static void stopRecording(Context context) {
        invoke(sStopRecording, context);
    }

    private static void invoke(Method method, Object... params) {
        if (sLookbackClazz != null && method != null) {
            try {
                method.invoke(sLookbackClazz, params);
            } catch (Exception e) {
                Log.e(TAG, "Can't invoke " + method.getName(), e);
            }
        }
    }

    static {
        if (BuildConfig.LOOKBACK_SDK_TOKEN != null &&
                !BuildConfig.LOOKBACK_SDK_TOKEN.isEmpty() &&
                "lookback".contentEquals(BuildConfig.FLAVOR_api)) {
            try {
                sLookbackClazz = Class.forName("io.lookback.sdk.Lookback");
                sInitMethod = sLookbackClazz.getDeclaredMethod("init", Application.class, String.class);
                sShowMethod = sLookbackClazz.getDeclaredMethod("show", Context.class, String.class);
                sStopRecording = sLookbackClazz.getDeclaredMethod("stopRecording", Context.class);
            } catch (ClassNotFoundException e) {
                // Silently ignore this error
                e.printStackTrace();
            } catch (NoSuchMethodException e) {
                // Ignore this too
                e.printStackTrace();
            }
        }
    }

}
