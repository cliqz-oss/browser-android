package com.cliqz.browser.starttab.freshtab

import acr.browser.lightning.preference.PreferenceManager
import android.os.Handler
import com.cliqz.browser.purchases.PurchasesManager

private const val SEVEN_DAYS_IN_MILLIS = 604800000L

class FreshTabPresenter(
        val purchasesManager: PurchasesManager,
        val preferenceManager: PreferenceManager,
        val view: FreshTabContract.View) :
        FreshTabContract.Actions {

    private var trialTries = 1

    override fun initialize() {
        loadData()
        showWelcomeMessage()
    }

    private fun loadData() {
        if (purchasesManager.purchase.isASubscriber) {
            view.hideAllTrialPeriodViews()
        } else {
            getTrialPeriod()
        }
    }

    private fun showWelcomeMessage() {
        if (preferenceManager.isFreshInstall) {
            preferenceManager.isFreshInstall = false
            view.toggleWelcomeMessage(show = true)
        }
        view.toggleWelcomeMessage(show = false)
    }

    override fun getTrialPeriod() {
        // Hacky solution with handler. Bus wasn't working, giving a DispatcherNotFoundException
        // We retry till we get a non null object.
        Handler().postDelayed({
            if (purchasesManager.trialPeriod != null) {
                purchasesManager.trialPeriod?.apply {
                    if (isInTrial) {
                        view.showTrialDaysLeft(trialDaysLeft)
                    } else {
                        showTrialPeriodExpired()
                    }
                }
            } else if (trialTries < 5) {
                getTrialPeriod()
            }
        }, 200)
    }

    private fun showTrialPeriodExpired() {
        if (preferenceManager.timeWhenTrialMessageDismissed() <
                (System.currentTimeMillis() - SEVEN_DAYS_IN_MILLIS)) {
            view.showTrialPeriodExpired()
        }
    }

    override fun disableTrialPeriodExpiredTemporarily() {
        preferenceManager.updateTimeOfTrialMessageDismissed()
    }

}
