package com.cliqz.utils;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.support.annotation.DrawableRes;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

/**
 * @author Stefano Pacifici
 * @date 2016/09/13
 */
public final class ResourcesUtils {

    private ResourcesUtils() {} // No instances

    public static Drawable getDrawable(@NonNull Context context, @DrawableRes int drawable,
                                       @Nullable Resources.Theme theme) {
        final Resources resources = context.getResources();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return resources.getDrawable(drawable, theme);
        } else {
            return resources.getDrawable(drawable);
        }
    }
}
