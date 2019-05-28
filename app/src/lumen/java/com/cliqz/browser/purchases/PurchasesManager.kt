package com.cliqz.browser.purchases

import android.content.Context
import android.util.Log
import com.cliqz.browser.main.Messages.GoToPurchase
import com.cliqz.nove.Bus
import com.revenuecat.purchases.PurchaserInfo
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.ReceivePurchaserInfoListener
import java.io.Serializable

class PurchasesManager @JvmOverloads constructor(
        val context: Context,
        val bus: Bus,
        isVpnEnabled: Boolean = false,
        isDashboardEnabled: Boolean = false) :
        Serializable, ReceivePurchaserInfoListener, TrialPeriodHandler.TrialPeriodResponseListener {

    override fun onTrialPeriodResponse(isInTrial: Boolean, trialDaysLeft: Int) {
        isVpnEnabled = isInTrial
        isDashboardEnabled = isInTrial
        bus.post(GoToPurchase(trialDaysLeft))
    }

    override fun onReceived(purchaserInfo: PurchaserInfo) {
        if (!purchaserInfo.activeSubscriptions.isEmpty()) {
            // If subscribed, enable features.
            for (sku in purchaserInfo.activeSubscriptions) {
                isVpnEnabled = sku.contains("vpn")
                isDashboardEnabled = sku.contains("basic")
            }
        } else {
            // Check if in trial period.
            TrialPeriodHandler.TrialPeriodHandlerTask(context, this).execute()
        }
    }

    override fun onError(error: PurchasesError) {
        Log.w("PurchasesManager", error.message)
    }

    var isVpnEnabled: Boolean = isVpnEnabled
        internal set

    var isDashboardEnabled: Boolean = isDashboardEnabled
        internal set

    fun checkPurchases() {
        try {
            Purchases.sharedInstance.getPurchaserInfo(this)
        } catch (_: UninitializedPropertyAccessException) {
            Log.w(PurchasesManager::class.java.simpleName, "RevenueCat is not initialized")
        }
    }
}
