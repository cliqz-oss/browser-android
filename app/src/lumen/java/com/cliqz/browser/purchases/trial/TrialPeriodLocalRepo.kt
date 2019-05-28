package com.cliqz.browser.purchases.trial

import acr.browser.lightning.preference.PreferenceManager
import com.google.gson.Gson
import com.google.gson.GsonBuilder

class TrialPeriodLocalRepo(private val preferenceManager: PreferenceManager) {

    // TODO: Use Base64 encoding or Android X's EncryptedSharedPreferences
    private val gson: Gson = GsonBuilder().serializeNulls().create()

    fun loadPurchaseInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        val trialPeriod = gson.fromJson<TrialPeriod>(
                preferenceManager.trialPeriodInfo, TrialPeriod::class.java)
        trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
    }

    fun saveTrialPeriodInfo(trialPeriod: TrialPeriod?) {
        preferenceManager.trialPeriodInfo = gson.toJson(trialPeriod)
    }
}
