package com.cliqz.browser.main.search;

import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.os.Handler;
import androidx.annotation.ColorInt;
import androidx.annotation.NonNull;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.jsengine.JSBridge;
import com.facebook.react.bridge.ReadableMap;

/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
public class FreshtabGetLogoCallback implements JSBridge.Callback, Runnable {

    private static final String TAG = FreshtabGetLogoCallback.class.getSimpleName();
    private static final String BACKGROUND_IMAGE_KEY = "backgroundImage";
    private static final String BACKGROUND_COLOR_KEY = "backgroundColor";
    private static final String TEXT_KEY = "text";

    private final IconViewHolder holder;
    private final Handler handler;
    private final boolean roundCorners;
    private ReadableMap mData = null;

    public FreshtabGetLogoCallback(
            @NonNull IconViewHolder holder,
            @NonNull Handler handler,
            boolean roundCorners) {
        this.holder = holder;
        this.handler = handler;
        this.roundCorners = roundCorners;
    }

    @Override
    public void callback(ReadableMap data) {
        mData = data.getMap("result");
        if (mData != null && holder.iconView != null) {
            handler.post(this);
        }
    }

    @Override
    public void run() {
        final String iconUrl = mData.hasKey(BACKGROUND_IMAGE_KEY) ?
                mData.getString(BACKGROUND_IMAGE_KEY): null;
        final @ColorInt int backgroundColor = mData.hasKey(BACKGROUND_COLOR_KEY) ?
                decodeColor(mData.getString(BACKGROUND_COLOR_KEY)) : 0xFF000000;
        final String text = mData.hasKey(TEXT_KEY) ? mData.getString(TEXT_KEY): null;

        final String alternateText;
        if (text != null && text.length() > 0) {
            alternateText = text;
        } else {
            // TODO @Khaled: if we have the domain in the LogoMeta class we can fallback here
            alternateText = "";
        }
        final Resources resources = holder.iconView.getResources();
        final int cornerRadius = roundCorners ? resources.getDimensionPixelSize(R.dimen.topsites_logo_cornes_radius) : 0;
        final int textSize = resources.getDimensionPixelSize(R.dimen.topsites_logo_textsize);
        final Drawable fallbackDrawable =
                new DefaultIconDrawable(alternateText, backgroundColor, textSize, cornerRadius);
        try {
            final int logoSize = (int) resources.getDimension(R.dimen.freshtab_icons_size);
            final String pngUri = Logo.getUriFromSvgUri(iconUrl, logoSize, logoSize);

            holder.iconView.getHierarchy().setFailureImage(fallbackDrawable);
            holder.iconView.setImageURI(pngUri);
        } catch (IllegalArgumentException e) {
            // It typically happens when we try to download something after the Activity is
            // destroyed, but this is not a problem to us
            Log.w(TAG, e.getMessage());
        }
    }

    private int decodeColor(String backgroundColor) {
        return 0xFF000000 | Integer.parseInt(backgroundColor, 16);
    }
}
