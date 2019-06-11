package com.cliqz.browser.utils

import android.view.View
import android.view.ViewGroup

fun View.forEachChildView(closure: (View) -> Unit) {
    closure(this)
    val viewGroup = this as? ViewGroup ?: return
    for (i in 0 until viewGroup.childCount) {
        viewGroup.getChildAt(i).forEachChildView(closure)
    }
}

fun View.enableViewHierarchy(isEnabled: Boolean) {
    forEachChildView { it.isEnabled = isEnabled }
}
