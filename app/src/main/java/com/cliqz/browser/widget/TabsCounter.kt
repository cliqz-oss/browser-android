package com.cliqz.browser.widget

import android.content.Context
import android.graphics.*
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.view.View
import androidx.annotation.ColorInt
import androidx.core.content.ContextCompat
import com.cliqz.browser.R
import kotlin.math.min

class TabsCounter @JvmOverloads constructor(
        context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val counterBackground: Drawable = ContextCompat.getDrawable(context, R.drawable.tab_counter)!!
    private val counterBounds = Rect()
    private val textBounds = Rect()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FAKE_BOLD_TEXT_FLAG)
    private var textSize = 0f

    var counter: Int = 0
        set(value) {
            field = value
            calculateTextSize()
            invalidate()
        }

    @ColorInt var color: Int = Color.WHITE
        set(value) {
            field = value
            counterBackground.setColorFilter(field, PorterDuff.Mode.SRC_IN)
            paint.color = field
            invalidate()
        }

    init {
        paint.textAlign = Paint.Align.CENTER
        if (attrs != null) {
            val typedArray = context.obtainStyledAttributes(attrs, R.styleable.TabsCounter, 0, 0)
             try {
                color = typedArray.getColor(R.styleable.TabsCounter_color, Color.WHITE)
            } finally {
                typedArray.recycle()
            }
        } else {
            color = Color.WHITE
        }
    }

    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        if (changed) {
            counterBounds.left = 0
            counterBounds.top = 0
            counterBounds.right = right - left
            counterBounds.bottom = bottom - top
            counterBackground.bounds = counterBounds

            calculateTextSize()
        }
    }

    private fun calculateTextSize() {
        textSize = min(counterBounds.width(), counterBounds.height()).toFloat() * TEXT_SIZE_PROPORTION
    }

    override fun onDraw(canvas: Canvas?) {
        counterBackground.draw(canvas!!)
        val text = counter.toString()
        paint.textSize = textSize
        paint.getTextBounds(text, 0, text.length, textBounds)
        val x = width / 2f
        val y = (height + textBounds.height()).toFloat() / 2f
        canvas.drawText(text, x, y, paint)
    }

    companion object {
        private const val TEXT_SIZE_PROPORTION = 0.44f
    }
}