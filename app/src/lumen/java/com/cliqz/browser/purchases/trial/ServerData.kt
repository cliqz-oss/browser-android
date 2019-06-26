package com.cliqz.browser.purchases.trial

import java.io.Serializable

class ServerData(
        var isInTrial: Boolean,
        var trialDaysLeft: Int,
        var userName: String,
        var password: String
) : Serializable
