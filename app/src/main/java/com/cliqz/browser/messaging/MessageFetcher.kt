package com.cliqz.browser.messaging

import android.os.AsyncTask

import com.cliqz.browser.utils.HttpHandler

import org.json.JSONArray
import timber.log.Timber;

import java.net.MalformedURLException
import java.net.URL

/**
 * @author Ravjit Uppal
 */
class MessageFetcher internal constructor(private val mMessageReceivedListener: MessageReceivedListener) : AsyncTask<Void, Void, JSONArray>() {

    //@Todo Set up an url for mobile messages
    private val MESSAGE_URL = "https://s3.amazonaws.com/cdn.cliqz.com/notifications/messages_android.json"

    override fun doInBackground(vararg voids: Void): JSONArray? {
        try {
            val url = URL(MESSAGE_URL)
            return HttpHandler.sendRequest("GET", url, "application/json", null, null) as JSONArray?
        } catch (e: MalformedURLException) {
            Timber.e(e, "Inproduct message url error")
        }
        return null
    }

    override fun onPostExecute(jsonArray: JSONArray?) {
        super.onPostExecute(jsonArray)
        if (jsonArray != null) {
            mMessageReceivedListener.onMessageReceived(jsonArray)
        }
    }
}
