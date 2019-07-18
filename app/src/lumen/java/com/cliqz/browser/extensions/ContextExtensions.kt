package com.cliqz.browser.extensions

import android.content.Context
import androidx.annotation.StringRes
import com.cliqz.browser.R

@StringRes
fun Context.getStringIdByName(name: String): Int {
    val resId = resources.getIdentifier(name, "string", packageName)
    return if (resId != 0) resId else R.string.vpn_country_name_unknown
}