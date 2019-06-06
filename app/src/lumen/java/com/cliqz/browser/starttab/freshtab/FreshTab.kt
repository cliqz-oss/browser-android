package com.cliqz.browser.starttab.freshtab

import acr.browser.lightning.preference.PreferenceManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup

import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.PurchasesManager
import com.cliqz.browser.starttab.StartTabFragment
import com.cliqz.nove.Bus
import kotlinx.android.synthetic.lumen.fragment_freshtab.*
import javax.inject.Inject

internal class FreshTab : StartTabFragment(), FreshTabContract.View {

    @Inject
    lateinit var purchasesManager: PurchasesManager

    @Inject
    lateinit var preferenceManager: PreferenceManager

    @Inject
    lateinit var bus: Bus

    private lateinit var freshTabPresenter: FreshTabPresenter

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        BrowserApp.getActivityComponent(activity)?.inject(this)
        freshTabPresenter = FreshTabPresenter(purchasesManager, preferenceManager, this)
        return inflater.inflate(R.layout.fragment_freshtab, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        freshTabPresenter.initialize()
    }

    override fun getTitle() = ""

    override fun getIconId() = R.drawable.ic_fresh_tab

    override fun showTrialPeriodExpired() {
        trial_period_lumen_upgrade.visibility = View.GONE
        welcome_image.visibility = View.GONE
        welcome_title.visibility = View.GONE
        trial_over_lumen_upgrade.visibility = View.VISIBLE
        trial_over_learn_more_btn.setOnClickListener {
            trial_over_lumen_upgrade.visibility = View.GONE
            bus.post(Messages.GoToPurchase(0))
        }
        trial_over_dismiss_btn.setOnClickListener {
            trial_over_lumen_upgrade.visibility = View.GONE
            freshTabPresenter.disableTrialPeriodExpiredTemporarily()
        }
    }

    override fun showTrialDaysLeft(daysLeft: Int) {
        trial_period_lumen_upgrade.visibility = View.VISIBLE
        trial_over_lumen_upgrade.visibility = View.GONE
        trial_period_upgrade_description.text =
                resources.getQuantityString(R.plurals.trial_period_upgrade_description, daysLeft, daysLeft)
        trial_period_lumen_upgrade.setOnClickListener {
            bus.post(Messages.GoToPurchase(0))
        }
    }

    override fun hideAllTrialPeriodViews() {
        trial_period_lumen_upgrade.visibility = View.GONE
        trial_over_lumen_upgrade.visibility = View.GONE
    }

    override fun toggleWelcomeMessage(show: Boolean) {
        welcome_image.visibility = if (show) View.VISIBLE else View.GONE
        welcome_title.visibility = if (show) View.VISIBLE else View.GONE
    }

}
