package com.cliqz.browser.purchases

import acr.browser.lightning.preference.PreferenceManager
import android.content.Context
import android.util.Log
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.SubscriptionConstants.Product
import com.cliqz.browser.purchases.trial.ServerData
import com.cliqz.browser.purchases.trial.TrialPeriodLocalRepo
import com.cliqz.browser.purchases.trial.TrialPeriodRemoteRepo
import com.cliqz.browser.purchases.trial.TrialPeriodResponseListener
import com.cliqz.nove.Bus
import com.revenuecat.purchases.PurchaserInfo
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.ReceivePurchaserInfoListener

private val TAG = PurchasesManager::class.java.simpleName

class PurchasesManager(
        val context: Context,
        val bus: Bus,
        val preferenceManager: PreferenceManager) :
        TrialPeriodResponseListener,
        ReceivePurchaserInfoListener {

    private val trialPeriodLocalRepo = TrialPeriodLocalRepo(preferenceManager)
    private val trialPeriodRemoteRepo = TrialPeriodRemoteRepo(context)

    var purchase = Purchase()

    var serverData: ServerData? = null

    var isLoading = true

    override fun onTrialPeriodResponse(serverData: ServerData?) {
        this.serverData = serverData
        isLoading = false
        preferenceManager.adBlockEnabled = serverData == null || serverData.isInTrial
        preferenceManager.isAttrackEnabled = serverData == null || serverData.isInTrial

        bus.post(Messages.OnTrialPeriodResponse())
    }

    override fun onReceived(purchaserInfo: PurchaserInfo) {
        if (purchaserInfo.activeSubscriptions.isNotEmpty()) {
            // If subscribed, enable features.
            for (sku in purchaserInfo.activeSubscriptions) {
                val isVpnEnabled = sku == Product.VPN || sku == Product.BASIC_VPN
                val isDashboardEnabled = sku == Product.BASIC || sku == Product.BASIC_VPN
                purchase.apply {
                    this.isASubscriber = true
                    this.isVpnEnabled = isVpnEnabled
                    this.isDashboardEnabled = isDashboardEnabled
                    this.sku = sku
                }
                if (!isDashboardEnabled) {
                    preferenceManager.adBlockEnabled = false
                    preferenceManager.isAttrackEnabled = false
                }
            }
            isLoading = false
        } else {
            purchase.isASubscriber = false
            // Check if in trial period.
            this.loadTrialPeriodInfo(this@PurchasesManager)
        }

    }

    override fun onError(error: PurchasesError) {
        Log.e("PurchasesManager", error.message)
    }

    fun checkPurchases() {
        try {
            Purchases.sharedInstance.getPurchaserInfo(this)
        } catch (_: UninitializedPropertyAccessException) {
            Log.w(TAG, "RevenueCat is not initialized")
        }
    }

    private fun loadTrialPeriodInfo(trialPeriodResponseListener: TrialPeriodResponseListener) {
        // Read trial period object from cache
        trialPeriodLocalRepo.loadPurchaseInfo(object : TrialPeriodResponseListener {
            override fun onTrialPeriodResponse(serverData: ServerData?) {
                trialPeriodResponseListener.onTrialPeriodResponse(serverData)
                // TODO: Can avoid querying network if not needed.
                trialPeriodRemoteRepo.loadPurchaseInfo(object : TrialPeriodResponseListener {
                    override fun onTrialPeriodResponse(serverData: ServerData?) {
                        trialPeriodResponseListener.onTrialPeriodResponse(serverData)
                        trialPeriodLocalRepo.saveTrialPeriodInfo(serverData)
                    }
                })
            }
        })
    }

    fun isDashboardEnabled() = if (purchase.isASubscriber) {
        purchase.isDashboardEnabled
    } else {
        serverData != null && serverData!!.isInTrial
    }

    fun isVpnEnabled() = if (purchase.isASubscriber) {
        purchase.isVpnEnabled
    } else {
        serverData != null && serverData!!.isInTrial
    }

}
