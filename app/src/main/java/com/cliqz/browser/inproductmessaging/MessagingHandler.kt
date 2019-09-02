package com.cliqz.browser.inproductmessaging

import org.json.JSONArray
import org.json.JSONException
import java.util.*
import timber.log.Timber;

/**
 * @author Ravjit Uppal
 */
class MessagingHandler private constructor() : MessageReceivedListener {

    private var mMessages: MutableList<Message>? = null

    val messages: List<Message>?
        get() = mMessages

    fun init() {
        mMessages = ArrayList()
        MessageFetcher(this).execute()
    }

    override fun onMessageReceived(messages: JSONArray) {
        try {
            for (idx in 0 until messages.length()) {
                val messageJson = messages.getJSONObject(idx)
                val rules = messageJson.getJSONArray("rules")
                var rulesSatisifed = true
                for (rulesIdx in 0 until rules.length()) {
                    val ruleName = rules.getJSONObject(rulesIdx).getString("fn")
                    when (ruleName) {
                        "locale" -> {
                            val messageLocal = rules.getJSONObject(rulesIdx).getString("value")
                            if (Locale.getDefault().language != messageLocal) {
                                rulesSatisifed = false
                            }
                        }
                    }
                }
                if (rulesSatisifed) {
                    val message = Message(messageJson.getString("title"), messageJson.getString("cta_url"), messageJson.getString("id"))
                    mMessages!!.add(message)
                }

            }
        } catch (e: JSONException) {
            Timber.e(e, "error reading inproduct message")
        }

    }

    fun hasNewMessages(): Boolean {
        return mMessages!!.size != 0
    }

    companion object {
        val instance = MessagingHandler()
    }
}
