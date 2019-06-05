package com.cliqz.browser.purchases

import java.io.Serializable

class Purchase(
    var isVpnEnabled: Boolean =  false,
    var isDashboardEnabled: Boolean = false,
    var isASubscriber: Boolean = false,
    var sku: String = ""
) : Serializable
