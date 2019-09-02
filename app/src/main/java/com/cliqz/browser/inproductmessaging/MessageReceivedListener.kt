package com.cliqz.browser.inproductmessaging

import org.json.JSONArray

/**
 * @author Ravjit Uppal
 */
internal interface MessageReceivedListener {
    fun onMessageReceived(messages: JSONArray)
}

