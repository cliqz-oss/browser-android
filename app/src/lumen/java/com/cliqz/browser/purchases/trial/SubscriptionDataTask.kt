package com.cliqz.browser.purchases.trial

import android.content.Context
import android.net.Uri
import android.os.AsyncTask
import android.provider.Settings
import android.util.Log
import com.cliqz.browser.CliqzConfig
import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.extensions.getStringIdByName
import com.cliqz.browser.main.Messages
import com.cliqz.browser.utils.HttpHandler
import com.cliqz.nove.Bus
import com.revenuecat.purchases.Purchases
import de.blinkt.openvpn.ConfigConverter
import de.blinkt.openvpn.VpnProfile
import de.blinkt.openvpn.core.ProfileManager
import org.json.JSONObject
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

private val TAG = SubscriptionDataTask::class.java.simpleName
private const val CONTENT_TYPE_JSON = "application/json"

private val HEADERS = mapOf("x-api-key" to CliqzConfig.VPN_API_KEY)

/**
 * Load Subscriptions from the endpoint. It also have the side effect of refreshing the vpn
 * profiles.
 */
class SubscriptionDataTask(private val context: Context,
                           private val trialPeriodResponseListener: TrialPeriodResponseListener) : AsyncTask<Void, Void, ServerData>() {

    @Inject
    lateinit var bus: Bus

    init {
        BrowserApp.getAppComponent()?.inject(this)
    }

    override fun doInBackground(vararg params: Void): ServerData {
        val requestBody = JSONObject()
                .put("device_id", Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID))
                .put("revenue_cat_token", Purchases.sharedInstance.appUserID)
                .toString()
        val responseJSON = HttpHandler.sendRequest("POST", URL(CliqzConfig.CREDENTIAL_URL),
                CONTENT_TYPE_JSON, HEADERS, requestBody)
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
                importVpnProfiles(countryCode, openVpnConfig, vpnCountries.length())
            }
        }
        return ServerData(trialDaysLeft > 0, trialDaysLeft, userName, password)
    }

    override fun onPostExecute(serverData: ServerData) {
        trialPeriodResponseListener.onTrialPeriodResponse(serverData)
    }

    private fun importVpnProfiles(countryCode: String, openVpnConfig: String, totalProfiles: Int) {
        if (openVpnConfig.isEmpty()) {
            return
        }
        val profileManager = ProfileManager.getInstance(context)
        val vpnProfile = profileManager.getProfileByName(countryCode)
        if (vpnProfile == null) {
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
            configConverter.setOnProfileImportListener {
                //No use of posting this message unless all profiles have been imported
                if (totalProfiles == ProfileManager.getInstance(context).profiles.size) {
                    bus.post(Messages.OnAllProfilesImported())
                    for (newVpnProfile in ProfileManager.getInstance(context).profiles) {
                        refreshProfileName(newVpnProfile)
                    }
                }
            }
            configConverter.startImportTask(vpnConfigUri, countryCode)
        } else {
            // Sanitize the profile name
            if (vpnProfile.profileNameRes == 0 || vpnProfile.profileNameRes == R.string.vpn_country_name_unknown) {
                refreshProfileName(vpnProfile)
            }
        }
    }

    private fun refreshProfileName(vpnProfile: VpnProfile) {
        vpnProfile.profileNameRes = context
                .getStringIdByName("vpn_country_name_${vpnProfile.name.toLowerCase()}")
        ProfileManager.getInstance(context).saveProfile(context, vpnProfile)
    }
}
