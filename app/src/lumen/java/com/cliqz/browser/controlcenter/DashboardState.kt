package com.cliqz.browser.controlcenter

import java.io.Serializable

/**
 * @author Ravjit Uppal
 */
class DashboardState(
        val adsBlocked: Int,
        val trackersDetected: Int,
        val dataSaved: Int,
        val pagesVisited: Int) : Serializable