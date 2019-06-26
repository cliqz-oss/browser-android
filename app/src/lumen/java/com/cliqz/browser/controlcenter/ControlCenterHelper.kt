package com.cliqz.browser.controlcenter

import acr.browser.lightning.constant.Constants
import android.view.View
import androidx.fragment.app.FragmentManager
import com.cliqz.browser.main.Messages
import com.cliqz.nove.Subscribe

/**
 * Copyright © Cliqz 2019
 */
class ControlCenterHelper(private val fragmentManager: FragmentManager) : ControlCenterActions {

    private var mSource: View? = null

    private var controlCenterDialog: ControlCenterDialog? = null

    override fun hideControlCenter() {
        dismissControlCenter(Messages.DismissControlCenter())
    }

    override fun toggleControlCenter() {
        controlCenterDialog = ControlCenterDialog.create(mSource)
        controlCenterDialog?.show(fragmentManager, Constants.CONTROL_CENTER)
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
