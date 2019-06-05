package com.cliqz.browser.purchases.trial

import java.io.Serializable

class TrialPeriod(
        var isInTrial: Boolean,
        var trialDaysLeft: Int
) : Serializable
