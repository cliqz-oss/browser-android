package com.cliqz.browser.purchases

import android.app.Activity
import android.os.Bundle
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager

import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingFlowParams

import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.purchases.productlist.OnBuyClickListener
import com.cliqz.browser.purchases.productlist.ProductListAdapter
import com.cliqz.browser.purchases.productlist.ProductRowData
import com.revenuecat.purchases.interfaces.ReceiveEntitlementsListener
import kotlinx.android.synthetic.lumen.fragment_purchase.*
import com.cliqz.browser.purchases.SubscriptionConstants.Entitlements
import com.cliqz.browser.purchases.SubscriptionConstants.Product
import com.revenuecat.purchases.*
import java.util.*
import javax.inject.Inject
import kotlin.collections.ArrayList

private val TAG = PurchaseFragment::class.java.simpleName

class PurchaseFragment : DialogFragment(), OnBuyClickListener {

    private lateinit var mAdapter: ProductListAdapter

    @set:Inject
    lateinit var purchasesManager: PurchasesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setStyle(STYLE_NORMAL, R.style.Theme_Purchase_Dialog)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? =
            inflater.inflate(R.layout.fragment_purchase, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        BrowserApp.getActivityComponent(activity as MainActivity)?.inject(this)
        close_btn.setOnClickListener { dismiss() }
        initRecyclerView()
        setLoading(true)
        getProductDetails()
    }

    private fun initRecyclerView() {
        mAdapter = ProductListAdapter(context, null, this)
        product_list.adapter = mAdapter
        product_list.layoutManager = LinearLayoutManager(context)
    }

    private fun getProductDetails() {
        Purchases.sharedInstance.getEntitlements(object : ReceiveEntitlementsListener {
            override fun onReceived(entitlementMap: Map<String, Entitlement>) {
                val productList = ArrayList<ProductRowData>()
                var isSubscribed = false
                entitlementMap[Entitlements.PREMIUM_SALE]?.offerings?.forEach {
                    (_, offering) -> offering.skuDetails?.apply {
                        if (sku == purchasesManager.purchase.sku) {
                            isSubscribed = true
                            productList.add(ProductRowData(sku, title, price, description, true))
                        } else {
                            productList.add(ProductRowData(sku, title, price, description, false))
                        }
                    }
                }
                if (productList.isEmpty()) {
                    // TODO: Display error
                } else {
                    customSwapProductListElements(productList)
                    mAdapter.setHasSubscription(isSubscribed)
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

    /**
     * The middle product in the list should always be "Basic + VPN".
     */
    private fun customSwapProductListElements(productList: List<ProductRowData>) {
        if (productList.size < 2) return
        val middleElement = productList[1]
        val basicVpnProductElement: ProductRowData = productList.find { it.sku == Product.BASIC_VPN }
                ?: return
        Collections.swap(productList, productList.indexOf(basicVpnProductElement), productList.indexOf(middleElement))
    }

    fun setLoading(flag: Boolean) {
        product_list.visibility = if (flag) View.GONE else View.VISIBLE
        loading.visibility = if (flag) View.VISIBLE else View.GONE
    }

    override fun onBuyClicked(position: Int) {
        val oldSku = ArrayList<String>()
        if (purchasesManager.purchase.sku.isNotEmpty()) {
            oldSku.add(purchasesManager.purchase.sku)
        }
        mAdapter.getProduct(position)?.apply {
            Purchases.sharedInstance.makePurchaseWith(activity as Activity, sku,
                    BillingClient.SkuType.SUBS, oldSku,
                    { error, _ ->
                        Log.e(TAG, error.underlyingErrorMessage)
                        Toast.makeText(context, error.underlyingErrorMessage, Toast.LENGTH_LONG).show()
                    },
                    { _, purchaseInfo ->
                        if (purchaseInfo.allPurchasedSkus.any { it.contains("vpn") }) {
                            purchasesManager.purchase.isVpnEnabled = true
                        }
                        if (purchaseInfo.allPurchasedSkus.any { it.contains("basic") }) {
                            purchasesManager.purchase.isDashboardEnabled = true
                        }
                        this@PurchaseFragment.dismiss()
                    }
            )
        }
    }
}
