package com.cliqz.browser.controlcenter

import android.annotation.SuppressLint
import android.content.Context
import android.util.AttributeSet
import android.view.MotionEvent

import androidx.viewpager.widget.ViewPager

/**
 * Copyright © Cliqz 2019
 */
class ControlCenterViewPager @JvmOverloads constructor(
        context: Context, attrs: AttributeSet? = null) : ViewPager(context, attrs) {

    @JvmField
    internal var isPagingEnabled = true

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        return this.isPagingEnabled && super.onTouchEvent(event)
    }

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        return this.isPagingEnabled && super.onInterceptTouchEvent(event)
    }

}
