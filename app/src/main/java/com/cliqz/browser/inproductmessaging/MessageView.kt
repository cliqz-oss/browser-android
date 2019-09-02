package com.cliqz.browser.inproductmessaging

import android.content.Context
import android.util.AttributeSet
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import butterknife.BindView
import butterknife.ButterKnife
import butterknife.OnClick
import com.cliqz.browser.R

/**
 * @author Ravjit Uppal
 */
class MessageView @JvmOverloads constructor(context: Context, attrs: AttributeSet? = null, defStyleAttr: Int = 0) : LinearLayout(context, attrs, defStyleAttr) {

    private var mMessage: Message? = null
    private var mListener: OnClickListener? = null

    @BindView(R.id.message_text)
    lateinit var messageTextView: TextView

    interface OnClickListener {
        fun onCloseClick()

        fun onActionClick(url: String)
    }

    init {
        View.inflate(context, R.layout.inproduct_message_view, this)
        ButterKnife.bind(this)
    }

    fun setMessage(message: Message) {
        mMessage = message
        messageTextView!!.text = message.message
    }

    fun setOnClickListener(listener: OnClickListener) {
        mListener = listener
    }

    @OnClick(R.id.message_close)
    internal fun closeClicked() {
        mListener!!.onCloseClick()
    }

    @OnClick(R.id.message_learn_more)
    internal fun learnMoreClicked() {
        mListener!!.onActionClick(mMessage!!.url)
    }
}
