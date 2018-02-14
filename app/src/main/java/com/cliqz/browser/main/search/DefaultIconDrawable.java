package com.cliqz.browser.main.search;

import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorFilter;
import android.graphics.Paint;
import android.graphics.PixelFormat;
import android.graphics.drawable.Drawable;
import android.support.annotation.NonNull;

/**
 * @author Khaled Tantawy
 */
public class DefaultIconDrawable extends Drawable {

    private final String name;
    private final int color;
    private final Paint paint;

    /**
     * A drawable made by the name in white with given size over the color background
     *
     * @param name The text to render centered in the drawable
     * @param color The background color
     * @param textSize icon text size in pixels
     */
    public DefaultIconDrawable(@NonNull String name, int color, int textSize) {
        this.name = name;
        this.color = color;
        this.paint = new Paint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
        paint.setTextSize(textSize);
        paint.setFakeBoldText(true);
        paint.setTextAlign(Paint.Align.CENTER);
        paint.setColor(Color.WHITE);
    }

    @Override
    public void draw(@NonNull Canvas canvas) {
        canvas.drawColor(color);
        int xPos = (canvas.getWidth() / 2);
        int yPos = (int) ((canvas.getHeight() / 2) - ((paint.descent() + paint.ascent()) / 2)) ;
        canvas.drawText(name, xPos, yPos, paint);
    }

    @Override
    public void setAlpha(int alpha) {
        // Nothing to do here
    }

    @Override
    public void setColorFilter(ColorFilter colorFilter) {
        // Nothing to do here
    }

    @Override
    public int getOpacity() {
        return PixelFormat.OPAQUE;
    }
}
