package com.cliqz.browser.utils

import java.io.Serializable

class PremiumSubscriptionManager(
        var isVpnEnabled: Boolean = false,
        var isDashboardEnabled: Boolean = false
) : Serializable
