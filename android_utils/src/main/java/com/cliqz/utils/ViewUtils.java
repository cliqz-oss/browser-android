package com.cliqz.utils;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.support.annotation.DrawableRes;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.view.View;

/**
 * @author Stefano Pacifici
 * @date 2016/09/13
 */
public final class ViewUtils {

    private ViewUtils() {} // No instances

    public static void setThemedBackgroundDrawable(@NonNull View view, @DrawableRes int drawable) {
        final Context context = view.getContext();
        final Resources.Theme theme = context.getTheme();
        setBackgroundDrawable(view, ResourcesUtils.getDrawable(context, drawable, theme));
    }

    public static void setThemedBackgroundDrawable(@NonNull View view, @DrawableRes int drawable,
                                                   @Nullable Resources.Theme theme) {
        final Context context = view.getContext();
        setBackgroundDrawable(view, ResourcesUtils.getDrawable(context, drawable, theme));
    }

    public static void setBackgroundDrawable(@NonNull View view, @Nullable Drawable drawable) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            view.setBackground(drawable);
        } else {
            view.setBackgroundDrawable(drawable);
        }

    }
}
