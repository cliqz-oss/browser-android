package com.cliqz.browser.starttab.freshtab

import acr.browser.lightning.bus.BrowserEvents
import acr.browser.lightning.preference.PreferenceManager
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.ScaleAnimation
import android.widget.AdapterView

import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.Messages
import com.cliqz.browser.main.search.TopsitesAdapter
import com.cliqz.browser.purchases.PurchasesManager
import com.cliqz.browser.starttab.StartTabFragment
import com.cliqz.browser.telemetry.Telemetry
import com.cliqz.browser.webview.CliqzMessages
import com.cliqz.browser.webview.Topsite
import com.cliqz.nove.Bus
import com.cliqz.nove.Subscribe
import kotlinx.android.synthetic.lumen.fragment_freshtab.*
import kotlinx.android.synthetic.lumen.fragment_freshtab_trial_over_msg.*
import kotlinx.android.synthetic.lumen.fragment_freshtab_trial_upgrade_msg.*
import javax.inject.Inject

private const val SEVEN_DAYS_IN_MILLIS = 604800000L

internal class FreshTab : StartTabFragment() {

    @Inject
    lateinit var purchasesManager: PurchasesManager

    @Inject
    lateinit var preferenceManager: PreferenceManager

    @Inject
    lateinit var bus: Bus

    private var isFreshInstall: Boolean = false

    @Inject
    lateinit var topsitesAdapter: TopsitesAdapter

    @Inject
    lateinit var telemetry: Telemetry

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        isFreshInstall = arguments?.getBoolean(ARG_IS_FRESH_INSTALL) ?: false
        BrowserApp.getActivityComponent(activity)?.inject(this)
        return inflater.inflate(R.layout.fragment_freshtab, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        initializeViews()
    }

    override fun onResume() {
        super.onResume()
        bus.register(this)
        topsitesAdapter.fetchTopsites()
    }

    override fun onPause() {
        super.onPause()
        bus.unregister(this)
    }


    private fun initializeViews() {
        topsites_grid.adapter = topsitesAdapter
        topsites_grid.onItemClickListener = AdapterView.OnItemClickListener { _, view, position, _ ->
            val topsite = topsitesAdapter.getItem(position) as Topsite
            val animation = ScaleAnimation(0.0f, 1.0f, 0.0f, 1.0f,
                    view.x + view.width / 2, view.y + view.height / 2)
            animation.duration = 200
            bus.post(CliqzMessages.OpenLink.open(topsite.url, animation))
            telemetry.sendTopsitesClickSignal(position, topsitesAdapter.displayedCount)
        }
        toggleWelcomeMessage()
        if (purchasesManager.purchase.isASubscriber) {
            hideAllTrialPeriodViews()
        } else {
            bus.post(Messages.OnTrialPeriodResponse())
        }
    }

    @Subscribe
    fun getTrialPeriod(onTrialPeriodResponse: Messages.OnTrialPeriodResponse) {
        if (purchasesManager.trialPeriod != null) {
            purchasesManager.trialPeriod?.apply {
                if (isInTrial) {
                    showTrialDaysLeft(trialDaysLeft)
                } else {
                    if (preferenceManager.timeWhenTrialMessageDismissed() <
                            (System.currentTimeMillis() - SEVEN_DAYS_IN_MILLIS)) {
                        showTrialPeriodExpired()
                    }
                }
            }
        }
    }

    override fun getTitle() = ""

    override fun getIconId() = R.drawable.ic_fresh_tab

    private fun showTrialPeriodExpired() {
        trial_period_lumen_upgrade.visibility = View.GONE
        welcome_message.visibility = View.GONE
        trial_over_lumen_upgrade.visibility = View.VISIBLE
        trial_over_learn_more_btn.setOnClickListener {
            trial_over_lumen_upgrade.visibility = View.GONE
            bus.post(Messages.GoToPurchase(0))
        }
        trial_over_dismiss_btn.setOnClickListener {
            trial_over_lumen_upgrade.visibility = View.GONE
            preferenceManager.updateTimeOfTrialMessageDismissed()
        }
    }

    private fun showTrialDaysLeft(daysLeft: Int) {
        trial_period_lumen_upgrade.visibility = View.VISIBLE
        trial_over_lumen_upgrade.visibility = View.GONE
        trial_period_upgrade_description.text =
                resources.getQuantityString(R.plurals.trial_period_upgrade_description, daysLeft, daysLeft)
        trial_period_lumen_upgrade.setOnClickListener {
            bus.post(Messages.GoToPurchase(0))
        }
    }

    private fun hideAllTrialPeriodViews() {
        trial_period_lumen_upgrade.visibility = View.GONE
        trial_over_lumen_upgrade.visibility = View.GONE
    }

    private fun toggleWelcomeMessage() {
        welcome_message.visibility = if (isFreshInstall) View.VISIBLE else View.GONE
        topsites_grid.visibility = if (isFreshInstall) View.GONE else View.VISIBLE
    }

    companion object {

        const val ARG_IS_FRESH_INSTALL = "is_fresh_install"

        @JvmStatic
        fun newInstance(isFreshInstall: Boolean) = FreshTab().apply{
            arguments = Bundle().apply {
                putBoolean(ARG_IS_FRESH_INSTALL, isFreshInstall)
            }
        }
    }
}
