package com.cliqz.browser.purchases

import acr.browser.lightning.preference.PreferenceManager
import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.android.billingclient.api.SkuDetails
import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.SubscriptionConstants.Entitlements
import com.cliqz.browser.purchases.SubscriptionConstants.Product
import com.cliqz.browser.purchases.productlist.OnBuyClickListener
import com.cliqz.browser.purchases.productlist.ProductListAdapter
import com.cliqz.browser.purchases.productlist.ProductRowData
import com.cliqz.nove.Bus
import com.revenuecat.purchases.Entitlement
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.interfaces.ReceiveEntitlementsListener
import com.revenuecat.purchases.makePurchaseWith
import kotlinx.android.synthetic.lumen.fragment_purchase.*
import java.util.*
import javax.inject.Inject
import kotlin.collections.ArrayList

private val TAG = PurchaseFragment::class.java.simpleName

class PurchaseFragment : DialogFragment(), OnBuyClickListener {

    private lateinit var mAdapter: ProductListAdapter

    @Inject
    lateinit var bus: Bus

    @Inject
    lateinit var purchasesManager: PurchasesManager

    @Inject
    lateinit var preferenceManager: PreferenceManager

    private var skuDetailsMap = mutableMapOf<String, SkuDetails>()

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
                skuDetailsMap.clear()
                val productList = ArrayList<ProductRowData>()
                var isSubscribed = false
                entitlementMap[Entitlements.PREMIUM_SALE]?.offerings?.forEach { (_, offering) ->
                    offering.skuDetails?.apply {
                        skuDetailsMap[sku] = this
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
        val oldSku = purchasesManager.purchase.sku
        mAdapter.getProduct(position)?.apply {
            skuDetailsMap[sku]?.let { skuDetails ->
                Purchases.sharedInstance.makePurchaseWith(
                        activity as Activity,
                        skuDetails,
                        oldSku,
                        onError = { error, _ ->
                            Log.e(TAG, error.underlyingErrorMessage)
                            Toast.makeText(context, error.message, Toast.LENGTH_LONG).show()
                        },
                        onSuccess = { purchase, _ ->
                            Purchases.sharedInstance.syncPurchases()
                            when (purchase.sku) {
                                Product.BASIC_VPN -> {
                                    purchasesManager.purchase.isVpnEnabled = true
                                    purchasesManager.purchase.isDashboardEnabled = true
                                    preferenceManager.isAttrackEnabled = true
                                    preferenceManager.adBlockEnabled = true
                                }
                                Product.BASIC -> {
                                    purchasesManager.purchase.isVpnEnabled = false
                                    purchasesManager.purchase.isDashboardEnabled = true
                                    preferenceManager.isAttrackEnabled = true
                                    preferenceManager.adBlockEnabled = true
                                }
                                Product.VPN -> {
                                    purchasesManager.purchase.isVpnEnabled = true
                                    purchasesManager.purchase.isDashboardEnabled = false
                                    preferenceManager.isAttrackEnabled = false
                                    preferenceManager.adBlockEnabled = false
                                }
                            }
                            purchasesManager.purchase.sku = purchase.sku
                            bus.post(Messages.PurchaseCompleted())
                            this@PurchaseFragment.dismiss()
                        }
                )
            }
        }
    }
}
