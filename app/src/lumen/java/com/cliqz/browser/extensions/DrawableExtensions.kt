package com.cliqz.browser.extensions

import android.content.Context
import android.graphics.PorterDuff
import android.graphics.drawable.Drawable
import android.widget.ImageView
import android.widget.TextView
import androidx.annotation.ColorInt
import androidx.annotation.ColorRes
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat
import androidx.core.graphics.drawable.DrawableCompat

fun TextView.drawableStart(@DrawableRes id: Int) {
    val drawable = ContextCompat.getDrawable(context, id)
    setCompoundDrawablesWithIntrinsicBounds(drawable, null, null,  null)
}

fun ImageView.setDrawable(@DrawableRes id: Int) {
    setImageDrawable(ContextCompat.getDrawable(context, id))
}

@ColorInt fun Context.getColorCompat(@ColorRes id: Int): Int {
    return ContextCompat.getColor(this, id)
}

fun ImageView.tint(@ColorRes id: Int) {
    drawable.tint(context, id)
}

fun Drawable.tint(@ColorInt value: Int): Drawable {
    val tintedDrawable = DrawableCompat.wrap(this).mutate()
    DrawableCompat.setTint(tintedDrawable, value)
    return tintedDrawable
}

fun Drawable.tint(context: Context, @ColorRes id: Int): Drawable {
    return tint(context.getColorCompat(id))
}

fun ImageView.tintVectorDrawable(@ColorRes id: Int) {
    setColorFilter(ContextCompat.getColor(context, id), PorterDuff.Mode.SRC_IN)
}

fun Context.color(@ColorRes id: Int) = ContextCompat.getColor(this, id)
