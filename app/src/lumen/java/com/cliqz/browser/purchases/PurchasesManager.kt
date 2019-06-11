package com.cliqz.browser.purchases

import acr.browser.lightning.preference.PreferenceManager
import android.content.Context
import android.util.Log
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.trial.TrialPeriod
import com.cliqz.browser.purchases.trial.TrialPeriodLocalRepo
import com.cliqz.browser.purchases.trial.TrialPeriodRemoteRepo
import com.cliqz.browser.purchases.trial.TrialPeriodResponseListener
import com.cliqz.nove.Bus
import com.revenuecat.purchases.PurchaserInfo
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.ReceivePurchaserInfoListener

class PurchasesManager(
        val context: Context,
        val bus: Bus,
        preferenceManager: PreferenceManager) :
        TrialPeriodResponseListener,
        ReceivePurchaserInfoListener {

    private val trialPeriodLocalRepo = TrialPeriodLocalRepo(preferenceManager)
    private val trialPeriodRemoteRepo = TrialPeriodRemoteRepo(context)

    var purchase = Purchase()

    var trialPeriod: TrialPeriod? = null

    var isLoading = true

    override fun onTrialPeriodResponse(trialPeriod: TrialPeriod?) {
        this.trialPeriod = trialPeriod
        isLoading = false
        bus.post(Messages.OnTrialPeriodResponse())
    }

    override fun onReceived(purchaserInfo: PurchaserInfo) {
        if (purchaserInfo.activeSubscriptions.isNotEmpty()) {
            // If subscribed, enable features.
            for (sku in purchaserInfo.activeSubscriptions) {
                val isVpnEnabled = sku.contains("vpn")
                val isDashboardEnabled = sku.contains("basic")
                purchase.apply {
                    this.isASubscriber = true
                    this.isVpnEnabled = isVpnEnabled
                    this.isDashboardEnabled = isDashboardEnabled
                    this.sku = sku
                }
            }
            isLoading = false
        } else {
            // Check if in trial period.
            this.loadPurchaseInfo(this@PurchasesManager)
        }

    }

    override fun onError(error: PurchasesError) {
        Log.e("PurchasesManager", error.message)
    }

    fun checkPurchases() {
        try {
            Purchases.sharedInstance.getPurchaserInfo(this)
        } catch (_: UninitializedPropertyAccessException) {
            Log.w(PurchasesManager::class.java.simpleName, "RevenueCat is not initialized")
        }
    }

    private fun loadPurchaseInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        // Read trial period object from cache
        trialPeriodLocalRepo.loadPurchaseInfo(object : TrialPeriodResponseListener {
            override fun onTrialPeriodResponse(trialPeriod: TrialPeriod?) {
                trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
                // TODO: Can avoid querying network if not needed.
                trialPeriodRemoteRepo.loadPurchaseInfo(object : TrialPeriodResponseListener {
                    override fun onTrialPeriodResponse(trialPeriod: TrialPeriod?) {
                        trialPeriodResponseListener.onTrialPeriodResponse(trialPeriod)
                        trialPeriodLocalRepo.saveTrialPeriodInfo(trialPeriod)
                    }
                })
            }
        })
    }

    fun isDashboardEnabled() : Boolean {
        return purchase.isDashboardEnabled || trialPeriod != null && trialPeriod!!.isInTrial
    }
}
