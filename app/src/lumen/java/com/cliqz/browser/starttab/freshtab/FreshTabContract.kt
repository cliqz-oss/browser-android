package com.cliqz.browser.starttab.freshtab

interface FreshTabContract {

    interface Actions {
        fun initialize()

        fun getTrialPeriod()

        fun disableTrialPeriodExpiredTemporarily()
    }

    interface View {
        fun showTrialPeriodExpired()

        fun showTrialDaysLeft(daysLeft: Int)

        fun hideAllTrialPeriodViews()

        fun toggleWelcomeMessage(show: Boolean)
    }
}