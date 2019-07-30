package com.cliqz.browser.purchases

import com.cliqz.browser.BuildConfig

internal object Entitlements {
    const val PREMIUM_SALE_STAGING = "[Staging] Premium Sale"
    const val PREMIUM_SALE = "Premium Sale"
}

/**
 * ProductIds on RevenueCat and Google Play Console.
 */
internal object Products {
    val BASIC = if (BuildConfig.DEBUG)
            "com.cliqz.android.lumen.staging.sale.basic"
        else
            "com.cliqz.android.lumen.sale.basic"

    val VPN = if (BuildConfig.DEBUG)
            "com.cliqz.android.lumen.staging.sale.vpn"
        else
            "com.cliqz.android.lumen.sale.vpn"

    val BASIC_PLUS_VPN = if (BuildConfig.DEBUG)
            "com.cliqz.android.lumen.staging.sale.basic_vpn"
        else
            "com.cliqz.android.lumen.sale.basic_vpn"

    /**
     * This is the order in which products should be displayed
     */
    val PRODUCTS_LIST = listOf(BASIC, BASIC_PLUS_VPN, VPN)

    /**
     * Maps a subscribed product to the ones to which the user can upgrade
     */
    val UPGRADE_MAP = mapOf(
            BASIC to setOf(VPN, BASIC_PLUS_VPN),
            VPN to setOf(BASIC_PLUS_VPN),
            BASIC_PLUS_VPN to emptySet())
            .withDefault { setOf(BASIC, VPN, BASIC_PLUS_VPN) }
}

internal object ProductName {
    const val BASIC = "Basic Monthly"
    const val VPN = "VPN Monthly"
    const val BASIC_VPN = "Basic + VPN Monthly"
}