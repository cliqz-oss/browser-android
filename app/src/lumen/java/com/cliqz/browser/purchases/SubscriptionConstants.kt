package com.cliqz.browser.purchases

class SubscriptionConstants {

    internal object Entitlements {
        const val PREMIUM_PROMO = "[Staging] Premium Promo"
        const val PREMIUM_SALE = "[Staging] Premium Sale"
    }

    /**
     * Product ID on RevenueCat and Google Play Console.
     */
    internal object Product {
        const val BASIC = "com.cliqz.android.lumen.staging.sale.basic"
        const val VPN = "com.cliqz.android.lumen.staging.sale.vpn"
        const val BASIC_VPN = "com.cliqz.android.lumen.staging.sale.basic_vpn"
    }

}
