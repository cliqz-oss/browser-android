package com.cliqz.browser.subscription

import android.os.AsyncTask
import com.cliqz.browser.BuildConfig
import com.cliqz.browser.utils.HttpHandler
import com.revenuecat.purchases.Purchases
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val CONTENT_TYPE_JSON = "application/json"
private val LUMEN_CREDENTIAL_URL = URL("https://auth-staging.lumenbrowser.com/get_credentials")

private val HEADERS = mapOf("x-api-key" to BuildConfig.VPN_API_KEY)

private val REQUEST_BODY = JSONObject()
        .put("device_id", Purchases.sharedInstance.appUserID)
        .put("revenue_cat_token", BuildConfig.REVENUECAT_API_KEY)
        .toString()

object TrialPeriodHandler {

    class TrialPeriodHandlerTask() : AsyncTask<Void, Void, Int>() {

        lateinit var trialPeriodResponseListener: TrialPeriodResponseListener

        constructor(trialPeriodResponseListener: TrialPeriodResponseListener): this() {
            this.trialPeriodResponseListener = trialPeriodResponseListener
        }

        override fun doInBackground(vararg params: Void): Int {
            val responseJSON =
                    HttpHandler.sendRequest("POST", LUMEN_CREDENTIAL_URL, CONTENT_TYPE_JSON, HEADERS, REQUEST_BODY)
            var trialDaysLeft = 0
            responseJSON?.let {
                trialDaysLeft = when (it.get("status_code")) {
                    HttpURLConnection.HTTP_OK ->
                        responseJSON.getJSONObject("body").getString("trial_days_left")
                                .toInt()
                    else -> 0
                }
            }
            return trialDaysLeft
        }

        override fun onPostExecute(trialDaysLeft: Int) {
            super.onPostExecute(trialDaysLeft)
            trialPeriodResponseListener.onTrialPeriodResponse(trialDaysLeft > 0, trialDaysLeft)
        }
    }

    interface TrialPeriodResponseListener {
        fun onTrialPeriodResponse(isInTrail: Boolean, trialDaysLeft: Int)
    }

}