package com.cliqz.browser.utils.extensions

import android.widget.TextView
import androidx.annotation.DrawableRes

fun TextView.drawableStart(@DrawableRes id: Int) {
    setCompoundDrawablesWithIntrinsicBounds(id, 0, 0, 0)
}
