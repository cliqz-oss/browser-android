package com.cliqz.browser.inproductmessaging

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

    private val MESSAGE_URL = "https://s3.amazonaws.com/cdn.cliqz.com/notifications/messages.19.02.2019.json"

    override fun doInBackground(vararg voids: Void): JSONArray? {
        try {
            val url = URL(MESSAGE_URL)
            return HttpHandler.sendRequest("GET", url, "application/json", null, null) as JSONArray?
        } catch (e: MalformedURLException) {
            Timber.e(e, "Inproduct message url error")
        }
        return null
    }

    override fun onPostExecute(jsonArray: JSONArray) {
        super.onPostExecute(jsonArray)
        mMessageReceivedListener.onMessageReceived(jsonArray)
    }
}
