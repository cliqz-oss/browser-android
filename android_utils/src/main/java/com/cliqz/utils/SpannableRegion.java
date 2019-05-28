package com.cliqz.utils;

import android.graphics.drawable.Drawable;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * @author Stefano Pacifici
 */
final class SpannableRegion {

    enum Type {
        LINK,
        DRAWABLE,
        LINE_BREAK
    }

    final int regionStart;
    final int regionEnd;
    final String text;
    final String url;
    final Drawable drawable;
    final Type type;

    SpannableRegion(int regionStart, int regionEnd) {
        this.regionStart = regionStart;
        this.regionEnd = regionEnd;
        this.text = "\n";
        this.url = null;
        this.drawable = null;
        this.type = Type.LINE_BREAK;
    }

    SpannableRegion(int regionStart, int regionEnd, @NonNull String alternateText,
                    @Nullable Drawable drawable) {
        this.regionStart = regionStart;
        this.regionEnd = regionEnd;
        this.text = alternateText;
        this.url = null;
        this.drawable = drawable;
        this.type = Type.DRAWABLE;
    }

    SpannableRegion(int regionStart, int regionEnd, @NonNull String linkText,
                    @NonNull String linkUrl) {
        this.regionStart = regionStart;
        this.regionEnd = regionEnd;
        this.text = linkText;
        this.url = linkUrl;
        this.drawable = null;
        this.type = Type.LINK;
    }
}
