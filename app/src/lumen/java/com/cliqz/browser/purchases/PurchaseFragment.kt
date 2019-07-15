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
import androidx.appcompat.app.AlertDialog
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
import com.cliqz.browser.purchases.SubscriptionConstants.ProductId
import com.cliqz.browser.purchases.SubscriptionConstants.ProductName
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
        initializeViews()
        setLoading(true)
        getProductDetails()
    }

    private fun initializeViews() {
        mAdapter = ProductListAdapter(context, null, this)
        product_list.adapter = mAdapter
        product_list.layoutManager = LinearLayoutManager(context)

        restore_purchase.setOnClickListener {
            checkExistingPurchases(
                    onSuccess = { activeSku ->
                        enableFeatures(activeSku)
                        Toast.makeText(context, getString(R.string.restore_subscription_success),
                                Toast.LENGTH_LONG).show()
                    },
                    onError = {
                        Toast.makeText(context, R.string.restore_subscription_error_msg,
                                Toast.LENGTH_LONG).show()
                    }
            )
        }
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
        val basicVpnProductElement: ProductRowData = productList.find {
            it.sku in setOf(ProductId.BASIC_VPN, ProductId.BASIC_VPN_STAGING)
        } ?: return
        Collections.swap(productList, productList.indexOf(basicVpnProductElement), productList.indexOf(middleElement))
    }

    fun setLoading(flag: Boolean) {
        product_list.visibility = if (flag) View.GONE else View.VISIBLE
        loading.visibility = if (flag) View.VISIBLE else View.GONE
        restore_purchase.visibility = if (flag || purchasesManager.purchase.isASubscriber) {
            View.GONE
        } else {
            View.VISIBLE
        }
    }

    override fun onBuyClicked(position: Int) {
        mAdapter.getProduct(position)?.apply {
            checkExistingPurchases(
                    onSuccess = { activeSku -> showRestorePurchasesDialog(sku = activeSku) },
                    onError = { makePurchase(sku) }
            )
        }
    }

    private fun checkExistingPurchases(onSuccess: (activeSku: String) -> Unit, onError: () -> Unit) {
        if (purchasesManager.purchase.sku.isNotEmpty()) {
            onError()
            return
        }
        Purchases.sharedInstance.restorePurchasesWith(
                onError = {
                    Log.w(TAG, it.message)
                    onError()
                },
                onSuccess = {
                    if (it.activeSubscriptions.isEmpty()) {
                        onError()
                    } else {
                        onSuccess(it.activeSubscriptions.first())
                    }
                }
        )
    }

    private fun showRestorePurchasesDialog(sku: String) {
        val productName = getProductNameById(sku)
        AlertDialog.Builder(context!!)
                .setTitle(R.string.restore_subscription_dialog_title)
                .setMessage(getString(R.string.restore_subscription_dialog_desc, productName))
                .setPositiveButton(R.string.restore_subscription_dialog_positive_btn) { _, _ ->
                    enableFeatures(sku)
                    Toast.makeText(context, getString(R.string.restore_subscription_success),
                            Toast.LENGTH_LONG).show()
                }
                .setNegativeButton(R.string.cancel, null)
                .show()
    }

    private fun makePurchase(sku: String) {
        val oldSku = ArrayList<String>()
        if (purchasesManager.purchase.sku.isNotEmpty()) {
            oldSku.add(purchasesManager.purchase.sku)
        }
        Purchases.sharedInstance.makePurchaseWith(
                activity as Activity,
                sku,
                BillingClient.SkuType.SUBS,
                oldSku,
                onError = { error, userCancelled ->
                    if (!userCancelled) {
                        Log.e(TAG, "${error.underlyingErrorMessage}")
                        Toast.makeText(context, error.message, Toast.LENGTH_LONG).show()
                    }
                },
                onSuccess = { purchase, _ ->
                    enableFeatures(purchase.sku)
                    Toast.makeText(context, "Purchase complete!", Toast.LENGTH_SHORT).show()
                }
        )
    }

    private fun enableFeatures(sku: String) {
        when (sku) {
            ProductId.BASIC_VPN, ProductId.BASIC_VPN_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = true
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            ProductId.BASIC, ProductId.BASIC_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = false
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            ProductId.VPN, ProductId.VPN_STAGING -> {
                purchasesManager.purchase.isVpnEnabled = true
                purchasesManager.purchase.isDashboardEnabled = false
                preferenceManager.isAttrackEnabled = false
                preferenceManager.adBlockEnabled = false
            }
        }
        purchasesManager.purchase.sku = sku
        purchasesManager.purchase.isASubscriber = true
        if (purchasesManager.purchase.isVpnEnabled) {
            purchasesManager.loadTrialPeriodInfo()
        }
        bus.post(Messages.PurchaseCompleted())
        dismiss()
    }

    private fun getProductNameById(sku: String) = when (sku) {
        ProductId.BASIC, ProductId.BASIC_STAGING -> ProductName.BASIC
        ProductId.VPN, ProductId.VPN_STAGING -> ProductName.VPN
        ProductId.BASIC_VPN, ProductId.BASIC_VPN_STAGING -> ProductName.BASIC_VPN
        else -> IllegalArgumentException("Invalid product id $sku")
    }
}
