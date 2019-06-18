package com.cliqz.browser.extensions

import android.widget.TextView
import androidx.annotation.DrawableRes
import androidx.core.content.ContextCompat

fun TextView.drawableStart(@DrawableRes id: Int) {
    val drawable = ContextCompat.getDrawable(context, id)
    setCompoundDrawablesWithIntrinsicBounds(drawable, null, null,  null)
}
