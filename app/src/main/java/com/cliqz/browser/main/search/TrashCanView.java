package com.cliqz.browser.main.search;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.appcompat.widget.AppCompatTextView;

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
        defaultTint = ContextCompat.getColor(context, R.color.white);
        drawable = ContextCompat.getDrawable(context,R.drawable.ic_delete);
        if (drawable == null) {
            throw new RuntimeException("Null drawable");
        }
        drawable.setColorFilter(defaultTint, PorterDuff.Mode.SRC_ATOP);
        setCompoundDrawablesWithIntrinsicBounds(drawable, null, null, null);
        setId(R.id.trash_topsites_id);
    }

    public boolean checkCollision(@NonNull Rect bounds) {
        getHitRect(hitRect);
        return (hitRect.intersect(bounds));
    }

    public void setCollisionMode(boolean isColliding) {
        final int tint = isColliding ? Color.RED : defaultTint;
        drawable.setColorFilter(tint, PorterDuff.Mode.SRC_ATOP);
    }
}
