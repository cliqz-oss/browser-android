package com.cliqz.utils;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.support.annotation.ColorInt;
import android.support.annotation.ColorRes;
import android.support.annotation.DrawableRes;
import android.support.annotation.NonNull;
import android.support.annotation.StringRes;
import android.support.v4.content.ContextCompat;

/**
 * @author Stefano Pacifici
 */
public class ActivityUtils {

    /**
     * Given an activity try to set the task description on supported platform
     *
     * @param activity the activity (task) you want to change description
     * @param titleId resource id of the desired title (R.string)
     * @param colorId resource id of the desired title background (R.color)
     * @param iconId resourece id of the desired icon drawable (R.drawable or R.mipmap)
     */
    public static void setTaskDescription(@NonNull Activity activity, @StringRes int titleId,
                                          @ColorRes int colorId, @DrawableRes int iconId) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            final Resources resources = activity.getResources();
            final Bitmap icon = BitmapFactory.decodeResource(resources, iconId);
            @ColorInt final int color =ContextCompat.getColor(activity, colorId);
            final String title = resources.getString(titleId);
            setTaskDescription(activity, title, color, icon);
        }
    }

    /**
     * Given an activity try to set the task description on supported platform
     *
     * @param activity the activity (task) you want to change description
     * @param title the task description title (a non-null string)
     * @param colorId resource id of the desired title background (R.color)
     * @param iconId resourece id of the desired icon drawable (R.drawable or R.mipmap)
     */
    public static void setTaskDescription(@NonNull Activity activity, @NonNull String title,
                                          @ColorRes int colorId, @DrawableRes int iconId) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            final Resources resources = activity.getResources();
            final Bitmap icon = BitmapFactory.decodeResource(resources, iconId);
            @ColorInt final int color =ContextCompat.getColor(activity, colorId);
            setTaskDescription(activity, title, color, icon);
        }
    }

    /**
     * Given an activity try to set the task description on supported platform
     *
     * @param activity the activity (task) you want to change description
     * @param title the task description title (a non-null string)
     * @param color a 32bit color code
     * @param icon the non-null icon bitmap
     * @see android.graphics.Color
     */
    public static void setTaskDescription(@NonNull Activity activity, @NonNull String title,
                                          @ColorInt int color, @NonNull Bitmap icon) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            final ActivityManager.TaskDescription description =
                    new ActivityManager.TaskDescription(title, icon, color);
            activity.setTaskDescription(description);
        }
    }
}
