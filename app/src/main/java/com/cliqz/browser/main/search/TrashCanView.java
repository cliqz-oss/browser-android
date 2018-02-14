package com.cliqz.browser.main.search;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.support.annotation.NonNull;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.AppCompatTextView;
import android.util.DisplayMetrics;
import android.util.TypedValue;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
class TrashCanView extends AppCompatTextView {

    // Used exclusively by the checkCollision method
    private final Rect hitRect = new Rect();
    private final Drawable drawable;
    private final int defaultTint;

    public TrashCanView(Context context) {
        super(context);
        final DisplayMetrics metrics = context.getResources().getDisplayMetrics();
        final float textSize = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_SP, 7, metrics);
        defaultTint = ContextCompat.getColor(context, R.color.accent_color);
        drawable = ContextCompat.getDrawable(context,R.drawable.ic_clear_black_24dp);
        if (drawable == null) {
            throw new RuntimeException("Null drawable");
        }
        drawable.setColorFilter(defaultTint, PorterDuff.Mode.SRC_ATOP);
        setTextColor(defaultTint);
        setTextSize(textSize);
        setText(R.string.action_delete);

        setCompoundDrawablesWithIntrinsicBounds(drawable, null, null, null);
    }

    public boolean checkCollision(@NonNull Rect bounds) {
        getHitRect(hitRect);
        return (hitRect.intersect(bounds));
    }

    public void setCollisionMode(boolean isColliding) {
        final int tint = isColliding ? Color.RED : defaultTint;
        drawable.setColorFilter(tint, PorterDuff.Mode.SRC_ATOP);
        setTextColor(tint);
    }
}
