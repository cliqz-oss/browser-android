package com.cliqz.browser.controlcenter

import acr.browser.lightning.preference.PreferenceManager
import android.content.Context
import android.util.Log
import android.view.View
import androidx.fragment.app.FragmentManager
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.PurchasesManager
import com.cliqz.browser.utils.extensions.enableViewHierarchy
import com.cliqz.jsengine.Adblocker
import com.cliqz.jsengine.AntiTracking
import com.cliqz.jsengine.EngineNotYetAvailable
import com.cliqz.jsengine.Insights
import com.cliqz.nove.Bus
import com.cliqz.nove.Subscribe
import kotlinx.android.synthetic.lumen.control_center_container.view.*
import kotlinx.android.synthetic.lumen.subscribe_ultimate_protection_view.view.*
import javax.inject.Inject

/**
 * Copyright © Cliqz 2019
 */
class ControlCenterHelper(fragmentManager: FragmentManager, mContext: Context,
                          private val parent: View) : ControlCenterActions {

    private val mControlCenterPagerAdapter: ControlCenterPagerAdapter

    @Inject
    internal lateinit var antiTracking: AntiTracking

    @Inject
    internal lateinit var adblocker: Adblocker

    @Inject
    internal lateinit var bus: Bus

    @Inject
    internal lateinit var insights: Insights

    @Inject
    internal lateinit var purchasesManager: PurchasesManager

    @Inject
    internal lateinit var preferenceManager: PreferenceManager

    init {
        BrowserApp.getAppComponent().inject(this)
        bus.register(this)

        mControlCenterPagerAdapter = ControlCenterPagerAdapter(fragmentManager, mContext)
        mControlCenterPagerAdapter.init()

        parent.control_center_pager.adapter = mControlCenterPagerAdapter
        parent.control_center_tab_layout.setupWithViewPager(parent.control_center_pager)

        val isDashboardEnabled = preferenceManager.isAttrackEnabled && preferenceManager.adBlockEnabled

        hideSubscribeButton(isDashboardEnabled)

        parent.ultimate_protection_switch.setOnCheckedChangeListener { _, isChecked ->
            mControlCenterPagerAdapter.updateViewComponent(0, isChecked)
            mControlCenterPagerAdapter.updateViewComponent(1, isChecked)
            try {
                adblocker.setEnabled(isChecked)
                antiTracking.setEnabled(isChecked)
                preferenceManager.isAttrackEnabled = isChecked
                preferenceManager.adBlockEnabled = isChecked
                bus.post(Messages.onDashboardStateChange())
            } catch (engineNotYetAvailable: EngineNotYetAvailable) {
                Log.e("JsEngineError", "Cannot enable/disable tracking modules", engineNotYetAvailable)
            }
        }
    }

    override fun hideControlCenter() {
        parent.visibility = View.GONE
    }

    override fun toggleControlCenter() {
        if (parent.control_center_container.visibility == View.VISIBLE) {
            parent.control_center_container.visibility = View.GONE
        } else {
            parent.control_center_container.visibility = View.VISIBLE
            updateUI()
        }
    }

    override fun setControlCenterData(source: View, isIncognito: Boolean, hashCode: Int, url: String) {
        // Do nothing.
    }

    @Subscribe
    fun clearDashboardData(clearDashboardData: Messages.ClearDashboardData) {
        insights.clearData()
        updateUI()
    }

    @Subscribe
    fun onPurchaseCompleted(purchaseCompleted: Messages.PurchaseCompleted) {
        hideSubscribeButton(purchasesManager.purchase.isDashboardEnabled)
    }

    private fun hideSubscribeButton(isDashboardEnabled: Boolean) {
        parent.ultimate_protection_switch.isChecked = isDashboardEnabled
        parent.subscribe_ultimate_protection.visibility =
                if (isDashboardEnabled) View.GONE else View.VISIBLE
        parent.ultimate_protection_container.enableViewHierarchy(isDashboardEnabled)
        parent.control_center_tab_layout.enableViewHierarchy(isDashboardEnabled)
        parent.control_center_pager.isPagingEnabled = isDashboardEnabled
        if (!isDashboardEnabled) {
            parent.subscribe_ultimate_protection_btn.setOnClickListener {
                bus.post(Messages.GoToPurchase(0))
            }
        }
    }

    private fun updateUI() {
        for (fragment in mControlCenterPagerAdapter.mFragmentList) {
            fragment.updateUI()
        }
    }

}
