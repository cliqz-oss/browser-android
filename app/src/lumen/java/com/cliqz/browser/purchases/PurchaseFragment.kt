package com.cliqz.browser.purchases

import acr.browser.lightning.preference.PreferenceManager
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

import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.productlist.OnBuyClickListener
import com.cliqz.browser.purchases.productlist.ProductListAdapter
import com.cliqz.browser.purchases.productlist.ProductRowData
import com.revenuecat.purchases.interfaces.ReceiveEntitlementsListener
import kotlinx.android.synthetic.lumen.fragment_purchase.*
import com.cliqz.browser.purchases.SubscriptionConstants.Entitlements
import com.cliqz.browser.purchases.SubscriptionConstants.Product
import com.cliqz.nove.Bus
import com.revenuecat.purchases.*
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
                val entitlement = if (entitlementMap[Entitlements.PREMIUM_SALE] == null) {
                    entitlementMap[Entitlements.PREMIUM_SALE_STAGING]
                } else {
                    entitlementMap[Entitlements.PREMIUM_SALE]
                }

                entitlement?.offerings?.forEach { (_, offering) ->
                    offering.skuDetails?.apply {
                        if (sku == purchasesManager.purchase.sku) {
                            isSubscribed = true
                            productList.add(ProductRowData(sku, title, price, description, true))
                        } else {
                            productList.add(ProductRowData(sku, title, price, description, false))
                        }
                    }
                }
                if (productList.isEmpty()) {
                    Toast.makeText(context, "Error retrieving available products", Toast.LENGTH_LONG).show()
                    Log.e(TAG, "Product list is empty.")
                    dismiss()
                } else {
                    customSwapProductListElements(productList)
                    mAdapter.setHasSubscription(isSubscribed)
                    mAdapter.updateProductList(productList)
                }
                setLoading(false)
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
        mAdapter.getProduct(position)?.apply {
            restoreExistingPurchase({ activeSku ->
                if (activeSku == sku) {
                    Toast.makeText(context, "You are already subscribed to this package", Toast.LENGTH_LONG).show()
                    // TODO: Can remove this line and provide a restore button.
                    enableFeatures(sku)
                } else {
                    makePurchase(sku)
                }
            }, {
                makePurchase(sku)
            })
        }
    }

    private fun restoreExistingPurchase(success: (sku: String) -> Unit, cannotRestore: () -> Unit) {
        Purchases.sharedInstance.restorePurchasesWith(
                {
                    Log.w(TAG, it.message)
                    cannotRestore()
                },
                {
                    if (it.activeSubscriptions.isEmpty()) {
                        cannotRestore()
                    } else {
                        success(it.activeSubscriptions.first())
                    }
                }
        )
    }

    private fun makePurchase(sku: String) {
        val oldSku = ArrayList<String>()
        if (purchasesManager.purchase.sku.isNotEmpty()) {
            oldSku.add(purchasesManager.purchase.sku)
        }
        Purchases.sharedInstance.makePurchaseWith(activity as Activity, sku,
                BillingClient.SkuType.SUBS, oldSku,
                { error, userCancelled ->
                    if (!userCancelled) {
                        Log.e(TAG, "${error.underlyingErrorMessage}")
                        Toast.makeText(context, error.message, Toast.LENGTH_LONG).show()
                    }
                },
                { purchase, _ ->
                    enableFeatures(purchase.sku)
                }
        )
    }

    private fun enableFeatures(sku: String) {
        when (sku) {
            Product.BASIC_VPN, Product.BASIC_VPN_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = true
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            Product.BASIC, Product.BASIC_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = false
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            Product.VPN, Product.VPN_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = true
                purchasesManager.purchase.isDashboardEnabled = false
                preferenceManager.isAttrackEnabled = false
                preferenceManager.adBlockEnabled = false
            }
        }
        purchasesManager.purchase.sku = sku
        purchasesManager.purchase.isASubscriber = true
        bus.post(Messages.PurchaseCompleted())
        dismiss()
    }
}
