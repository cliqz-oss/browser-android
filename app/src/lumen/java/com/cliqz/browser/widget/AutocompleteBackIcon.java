package com.cliqz.browser.widget;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.LayerDrawable;

import androidx.annotation.NonNull;
import androidx.vectordrawable.graphics.drawable.VectorDrawableCompat;

import com.cliqz.browser.R;

class AutocompleteBackIcon extends LayerDrawable {
    private AutocompleteBackIcon(Drawable[] drawables) {
        super(drawables);
    }

    public static Drawable create(@NonNull Context context) {
        final Resources resources = context.getResources();
        final Drawable backDrawable = VectorDrawableCompat.create(
                resources, R.drawable.ic_action_back, null);
        final AutocompleteBackIcon out =
                new AutocompleteBackIcon(new Drawable[] { backDrawable});
        out.setLayerInset(0, 0, 0, 0, 0);
        return out;
    }
}
