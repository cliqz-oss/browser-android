package com.cliqz.browser.purchases.trial

import acr.browser.lightning.preference.PreferenceManager
import android.util.Base64
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.ObjectInputStream
import java.io.ObjectOutputStream

class TrialPeriodLocalRepo(private val preferenceManager: PreferenceManager) {

    fun loadPurchaseInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        if (preferenceManager.trialPeriodInfo == null) {
            trialPeriodResponseListener.onTrialPeriodResponse(null)
            return
        }
        val bis = ByteArrayInputStream(Base64.decode(preferenceManager.trialPeriodInfo, Base64.DEFAULT))
        ObjectInputStream(bis).use {
            val trialPeriod = it.readObject() as ServerData
            trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
        }
    }

    fun saveTrialPeriodInfo(serverData: ServerData?) {
        if (serverData == null) {
            return
        }
        val bos = ByteArrayOutputStream()
        ObjectOutputStream(bos).use {
            it.writeObject(serverData)
            val base64 = Base64.encodeToString(bos.toByteArray(), Base64.DEFAULT)
            preferenceManager.trialPeriodInfo = base64
        }
    }
}
