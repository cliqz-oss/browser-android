package com.cliqz.browser.purchases

import android.app.Activity
import android.os.Bundle
import android.support.v4.app.DialogFragment
import android.support.v7.widget.LinearLayoutManager
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import com.android.billingclient.api.BillingClient

import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.purchases.productlist.OnBuyClickListener
import com.cliqz.browser.purchases.productlist.ProductListAdapter
import com.cliqz.browser.purchases.productlist.ProductRowData
import com.revenuecat.purchases.Entitlement
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.ReceiveEntitlementsListener
import com.revenuecat.purchases.makePurchaseWith
import kotlinx.android.synthetic.lumen.fragment_purchase.*
import javax.inject.Inject

private val TAG = PurchaseFragment::class.java.simpleName

class PurchaseFragment : DialogFragment(), OnBuyClickListener {

    private lateinit var mAdapter: ProductListAdapter

    @set:Inject
    lateinit var purchasesManager: PurchasesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(DialogFragment.STYLE_NORMAL, R.style.Theme_Purchase_Dialog)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? =
            inflater.inflate(R.layout.fragment_purchase, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        initRecyclerView()
        setLoading(true)
        getProductDetails()

        BrowserApp.getActivityComponent(activity as MainActivity)?.inject(this)
    }

    private fun initRecyclerView() {
        mAdapter = ProductListAdapter(null, this)
        product_list.adapter = mAdapter
        product_list.layoutManager = LinearLayoutManager(context)
    }

    private fun getProductDetails() {
        Purchases.sharedInstance.getEntitlements(object : ReceiveEntitlementsListener {
            override fun onReceived(entitlementMap: Map<String, Entitlement>) {
                val productList = ArrayList<ProductRowData>()
                entitlementMap[SubscriptionConstants.Entitlements.PREMIUM_SALE]?.offerings?.forEach {
                    (_, offering) -> offering.skuDetails?.apply {
                        productList.add(ProductRowData(sku, title, price, description))
                    }
                }
                if (productList.isEmpty()) {
                    // TODO: Display error
                } else {
                    mAdapter.updateProductList(productList)
                    setLoading(false)
                }
            }

            override fun onError(error: PurchasesError) {
                Log.e(TAG, error.message)
                // TODO: Display error
            }
        })
    }

    fun setLoading(flag: Boolean) {
        product_list.visibility = if (flag) View.GONE else View.VISIBLE
        loading.visibility = if (flag) View.VISIBLE else View.GONE
    }

    override fun onBuyClicked(position: Int) {
        mAdapter.getProduct(position)?.apply {
            Purchases.sharedInstance.makePurchaseWith(activity as Activity, sku,
                    BillingClient.SkuType.SUBS,
                    { error, _ ->
                        Log.e(TAG, error.underlyingErrorMessage)
                    },
                    { _, purchaseInfo ->
                        if (purchaseInfo.allPurchasedSkus.any { it.contains("vpn") }) {
                            purchasesManager.isVpnEnabled = true
                        }
                        if (purchaseInfo.allPurchasedSkus.any { it.contains("basic") }) {
                            purchasesManager.isDashboardEnabled = true
                        }
                        this@PurchaseFragment.dismiss()
                    }
            )
        }
    }

}
