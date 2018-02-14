package com.cliqz.utils;

import android.content.Context;
import android.content.res.Resources;
import android.os.Build;
import android.util.DisplayMetrics;
import android.view.Display;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.view.ViewConfiguration;
import android.view.WindowManager;

/**
 * @author Stefano Pacifici
 */
public class ContextUtils {

    private static final int DEFAULT_STATUS_BAR_HEIGHT = 25;

    public static int getStatusBarHeight(Context context) {
        final Resources resources = context.getResources();
        final int resourceId = resources.getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId != 0) {
            return resources.getDimensionPixelSize(resourceId);
        } else {
            return (int) Math.ceil(DEFAULT_STATUS_BAR_HEIGHT * resources.getDisplayMetrics().density);
        }
    }

    public static int getNavigationBarHeight(Context context) {
        final Resources resources = context.getResources();
        final int resourceId = resources.getIdentifier("navigation_bar_height", "dimen", "android");
        if (resourceId == 0 || !hasSoftKey(context)) {
            return 0;
        }

        return resources.getDimensionPixelSize(resourceId);
    }

    public static boolean hasSoftKey(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            final WindowManager windowManager =
                    (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
            final Display display = windowManager.getDefaultDisplay();
            final DisplayMetrics realDisplayMetrics = new DisplayMetrics();
            display.getRealMetrics(realDisplayMetrics);
            final DisplayMetrics displayMetrics = new DisplayMetrics();
            display.getMetrics(displayMetrics);
            return (realDisplayMetrics.widthPixels - displayMetrics.widthPixels) > 0 ||
                    (realDisplayMetrics.heightPixels - displayMetrics.heightPixels) > 0;
        } else {
            return !ViewConfiguration.get(context).hasPermanentMenuKey() &&
                    !KeyCharacterMap.deviceHasKey(KeyEvent.KEYCODE_BACK);
        }
    }
}
