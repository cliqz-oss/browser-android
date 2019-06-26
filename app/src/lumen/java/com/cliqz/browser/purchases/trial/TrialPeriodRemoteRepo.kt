package com.cliqz.browser.purchases.trial

import android.annotation.SuppressLint
import android.content.Context
import android.net.Uri
import android.os.AsyncTask
import android.provider.Settings
import android.util.Log
import com.cliqz.browser.BuildConfig
import com.cliqz.browser.utils.HttpHandler
import com.revenuecat.purchases.Purchases
import de.blinkt.openvpn.ConfigConverter
import de.blinkt.openvpn.core.ProfileManager
import org.json.JSONObject
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

private val TAG = TrialPeriodRemoteRepo::class.java.simpleName
private const val CONTENT_TYPE_JSON = "application/json"
private val LUMEN_CREDENTIAL_URL = URL("https://auth-staging.lumenbrowser.com/get_credentials")

private val HEADERS = mapOf("x-api-key" to BuildConfig.VPN_API_KEY)

class TrialPeriodRemoteRepo(private val context: Context) {

    fun loadPurchaseInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        TrialPeriodHandler.TrialPeriodHandlerTask(context, object : TrialPeriodResponseListener {
            override fun onTrialPeriodResponse(serverData: ServerData?) {
                trialPeriodResponseListener.onTrialPeriodResponse(serverData)
            }
        }).execute()
    }

    object TrialPeriodHandler {

        class TrialPeriodHandlerTask() : AsyncTask<Void, Void, ServerData>() {

            private lateinit var requestBody: String

            private lateinit var trialPeriodResponseListener: TrialPeriodResponseListener

            private lateinit var context: Context

            @SuppressLint("HardwareIds")
            constructor(context: Context, trialPeriodResponseListener: TrialPeriodResponseListener) : this() {
                this.context = context
                this.trialPeriodResponseListener = trialPeriodResponseListener
                requestBody = JSONObject()
                        .put("device_id", Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
                        .put("revenue_cat_token", Purchases.sharedInstance.appUserID)
                        .toString()
            }

            override fun doInBackground(vararg params: Void): ServerData {
                val responseJSON =
                        HttpHandler.sendRequest("POST", LUMEN_CREDENTIAL_URL, CONTENT_TYPE_JSON, HEADERS, requestBody)
                var trialDaysLeft = 0
                var userName = ""
                var password = ""
                if (responseJSON != null && responseJSON.get("status_code") == HttpURLConnection.HTTP_OK) {
                    trialDaysLeft = responseJSON.getJSONObject("body").getString("trial_days_left").toInt()
                    userName = responseJSON.getJSONObject("body").getJSONObject("credentials")
                            .getString("username")
                    password = responseJSON.getJSONObject("body").getJSONObject("credentials")
                            .getString("password")
                    val vpnCountries = responseJSON.getJSONObject("body").getJSONArray("nodes")
                    for (i in 0 until vpnCountries.length()) {
                        val country = vpnCountries.getJSONObject(i)
                        val countryCode = country.getString("countryCode")
                        val services = country.getJSONArray("services")
                        var openVpnConfig = ""
                        for (j in 0 until services.length()) {
                            val service = services.getJSONObject(j)
                            if (service.getString("name") == "openvpn" || service.getString("name") == "openvpn/standard") {
                                openVpnConfig = service.getString("config")
                            }
                        }
                        importVpnProfiles(countryCode, openVpnConfig)
                    }
                }
                return ServerData(trialDaysLeft > 0, trialDaysLeft, userName, password)
            }

            override fun onPostExecute(serverData: ServerData) {
                trialPeriodResponseListener.onTrialPeriodResponse(serverData)
            }

            private fun importVpnProfiles(countryCode: String, openVpnConfig: String) {
                if (openVpnConfig.isEmpty()) {
                    return
                }
                val profileManager = ProfileManager.getInstance(context)
                if (profileManager.getProfileByName(countryCode) == null) {
                    val outputDir = context.cacheDir
                    val outputFile = File.createTempFile(countryCode + "vpn", ".ovpn", outputDir)
                    outputFile.deleteOnExit()
                    try {
                        val bufferedWriter = BufferedWriter(FileWriter(outputFile))
                        bufferedWriter.write(openVpnConfig)
                        bufferedWriter.close()
                    } catch (e: IOException) {
                        Log.e(TAG, "File write failed: $e")
                    }
                    val vpnConfigUri = Uri.fromFile(outputFile)
                    val configConverter = ConfigConverter(context.applicationContext)
                    configConverter.startImportTask(vpnConfigUri, countryCode)
                }
            }
        }
    }
}
