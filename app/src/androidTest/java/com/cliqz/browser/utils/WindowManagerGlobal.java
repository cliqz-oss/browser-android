package com.cliqz.browser.utils;

import androidx.annotation.NonNull;
import android.view.View;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

/**
 * @author Kiiza Joseph Bazaare
 */
@SuppressWarnings("unchecked")
public class WindowManagerGlobal {
    private static Object managerReference = null;
    private static Method getViewRootNamesMth = null;
    private static Method getRootViewMth = null;

    @NonNull
    public static String[] getViewRootNames() {
        try {
            return (String[]) getViewRootNamesMth.invoke(managerReference);
        } catch (Throwable t) {
            throw new WindowManagerGlobalException(t);
        }
    }

    @NonNull
    public static View getRootView(String name) {
        try {
            return (View) getRootViewMth.invoke(managerReference, name);
        } catch (Throwable t) {
            throw new WindowManagerGlobalException(t);
        }
    }

    static {
        final ClassLoader classLoader = WindowManagerGlobal.class.getClassLoader();
        try {
            final Class clazz = classLoader.loadClass("android.view.WindowManagerGlobal");
            final Method getInstanceMth = clazz.getMethod("getInstance");
            managerReference = getInstanceMth.invoke(null);
            getViewRootNamesMth = clazz.getMethod("getViewRootNames");
            getRootViewMth = clazz.getMethod("getRootView", String.class);
        } catch (ClassNotFoundException | NoSuchMethodException | InvocationTargetException | IllegalAccessException e) {
            e.printStackTrace();
        }
    }

    public static class WindowManagerGlobalException extends RuntimeException {
        private WindowManagerGlobalException(Throwable cause) {
            super(cause);
        }
    }
}
