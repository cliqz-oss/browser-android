package com.cliqz.browser.messaging

import org.json.JSONArray

/**
 * @author Ravjit Uppal
 */
internal interface MessageReceivedListener {
    fun onMessageReceived(messages: JSONArray)
}

