package com.cliqz.browser.purchases

class SubscriptionConstants {

    internal object Entitlements {
        const val PREMIUM_SALE_STAGING = "[Staging] Premium Sale"
        const val PREMIUM_SALE = "Premium Sale"
    }

    /**
     * Product ID on RevenueCat and Google Play Console.
     */
    internal object Product {
        const val BASIC = "com.cliqz.android.lumen.sale.basic"
        const val VPN = "com.cliqz.android.lumen.sale.vpn"
        const val BASIC_VPN = "com.cliqz.android.lumen.sale.basic_vpn"

        const val BASIC_STAGING = "com.cliqz.android.lumen.staging.sale.basic"
        const val VPN_STAGING = "com.cliqz.android.lumen.staging.sale.vpn"
        const val BASIC_VPN_STAGING = "com.cliqz.android.lumen.staging.sale.basic_vpn"
    }

}
