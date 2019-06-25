package com.cliqz.browser.purchases.trial

import android.annotation.SuppressLint
import android.content.Context
import android.os.AsyncTask
import android.provider.Settings
import com.cliqz.browser.CliqzConfig
import com.cliqz.browser.utils.HttpHandler
import com.revenuecat.purchases.Purchases
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private const val CONTENT_TYPE_JSON = "application/json"
private val LUMEN_CREDENTIAL_URL = URL("https://auth-staging.lumenbrowser.com/get_credentials")

private val HEADERS = mapOf("x-api-key" to CliqzConfig.VPN_API_KEY)

class TrialPeriodRemoteRepo(private val context: Context) {

    fun loadPurchaseInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        TrialPeriodHandler.TrialPeriodHandlerTask(context, object : TrialPeriodResponseListener {
            override fun onTrialPeriodResponse(trialPeriod: TrialPeriod?) {
                trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
            }
        }).execute()
    }

    object TrialPeriodHandler {

        class TrialPeriodHandlerTask() : AsyncTask<Void, Void, Int>() {

            private lateinit var requestBody: String

            private lateinit var trialPeriodResponseListener: TrialPeriodResponseListener

            @SuppressLint("HardwareIds")
            constructor(context: Context, trialPeriodResponseListener: TrialPeriodResponseListener): this() {
                this.trialPeriodResponseListener = trialPeriodResponseListener
                requestBody = JSONObject()
                        .put("device_id", Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
                        .put("revenue_cat_token", Purchases.sharedInstance.appUserID)
                        .toString()
            }

            override fun doInBackground(vararg params: Void): Int {
                val responseJSON =
                        HttpHandler.sendRequest("POST", LUMEN_CREDENTIAL_URL, CONTENT_TYPE_JSON, HEADERS, requestBody)
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
                val trialPeriod = TrialPeriod(
                        isInTrial = trialDaysLeft > 0,
                        trialDaysLeft = trialDaysLeft)
                trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
            }
        }
    }
}
