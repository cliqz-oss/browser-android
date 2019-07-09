package com.cliqz.browser.controlcenter

import acr.browser.lightning.constant.Constants
import android.content.Context
import android.view.View
import androidx.fragment.app.FragmentManager
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivityHandler
import com.cliqz.browser.main.Messages
import com.cliqz.nove.Bus
import com.cliqz.nove.Subscribe
import javax.inject.Inject

/**
 * Copyright © Cliqz 2019
 */
class ControlCenterHelper(context : Context, private val fragmentManager: FragmentManager) : ControlCenterActions {

    @Inject
    lateinit var handler: MainActivityHandler

    @Inject
    lateinit var bus : Bus

    init {
        BrowserApp.getActivityComponent(context)?.inject(this)
    }

    private var mSource: View? = null

    private var controlCenterDialog: ControlCenterDialog? = null

    override fun hideControlCenter() {
        dismissControlCenter(Messages.DismissControlCenter())
    }

    override fun toggleControlCenter() {
        if (controlCenterDialog != null && controlCenterDialog!!.isVisible) {
            controlCenterDialog?.dialog?.dismiss()
            return
        }
        controlCenterDialog = ControlCenterDialog.create(mSource)
        controlCenterDialog?.show(fragmentManager, Constants.CONTROL_CENTER)
        handler.postDelayed({
            bus.post(Messages.DismissVpnPanel())
        }, 500)
    }

    override fun setControlCenterData(source: View, isIncognito: Boolean, hashCode: Int, url: String) {
        mSource = source
    }

    @Subscribe
    internal fun dismissControlCenter(event: Messages.DismissControlCenter) {
        controlCenterDialog?.apply {
            dismissAllowingStateLoss()
        }
    }
}
