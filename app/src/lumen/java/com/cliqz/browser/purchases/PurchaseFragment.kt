package com.cliqz.browser.purchases

import acr.browser.lightning.preference.PreferenceManager
import android.app.Activity
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.DialogFragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.android.billingclient.api.BillingClient
import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.Products.PRODUCTS_LIST
import com.cliqz.browser.purchases.Products.UPGRADE_MAP
import com.cliqz.browser.purchases.productlist.OnPurchaseClickListener
import com.cliqz.browser.purchases.productlist.ProductListAdapter
import com.cliqz.browser.purchases.productlist.ProductRowData
import com.cliqz.nove.Bus
import com.revenuecat.purchases.*
import com.revenuecat.purchases.interfaces.ReceiveEntitlementsListener
import kotlinx.android.synthetic.lumen.fragment_purchase.*
import javax.inject.Inject

private val TAG = PurchaseFragment::class.java.simpleName

class PurchaseFragment : DialogFragment(), OnPurchaseClickListener {

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
        context?.let {
            mAdapter = ProductListAdapter(purchasesManager, it, this)
            product_list.adapter = mAdapter
            product_list.layoutManager = LinearLayoutManager(context)
        }
    }

    private fun getProductDetails() {
        Purchases.sharedInstance.getEntitlements(object : ReceiveEntitlementsListener {
            override fun onReceived(entitlementMap: Map<String, Entitlement>) {
                val entitlement =
                        entitlementMap[Entitlements.PREMIUM_SALE] ?:
                        entitlementMap[Entitlements.PREMIUM_SALE_STAGING]

                val productSet = (entitlement?.offerings ?: emptyMap())
                        .map { (_, off) -> off.activeProductIdentifier to off.skuDetails }
                        .toMap()
                val productList = mutableListOf<ProductRowData>()
                PRODUCTS_LIST.mapNotNullTo(productList) { sku ->
                    productSet[sku]?.let { detail ->
                        ProductRowData(
                                detail.sku,
                                detail.title,
                                detail.price,
                                detail.description,
                                detail.sku == purchasesManager.purchase.sku
                        )
                    }
                }
                val subscription = productList.find { it.isSubscribed }

                if (productList.isEmpty()) {
                    Toast.makeText(context, "Error retrieving available products", Toast.LENGTH_LONG).show()
                    Log.e(TAG, "Product list is empty.")
                    dismiss()
                } else {
                    mAdapter.setSubscription(subscription)
                    productList.removeAll {product ->
                        // Do not remove the current subscribed product and
                        // remove product which is a downgrade.
                        product.sku != subscription?.sku &&
                                !(UPGRADE_MAP[subscription?.sku]?.contains(product.sku) ?: true)
                    }
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

    fun setLoading(flag: Boolean) {
        product_list.visibility = if (flag) View.GONE else View.VISIBLE
        loading.visibility = if (flag) View.VISIBLE else View.GONE
    }

    override fun onBuyClicked(position: Int) {
        mAdapter.getProduct(position).apply {
            val progress = addProgressView()
            // Please notice, it is pointless to add an animation to make the progress disappear,
            // the payment interface will appear in any case half a second after the animation ends
            checkExistingPurchases(
                    onSuccess = {activeSku ->
                        removeProgressView(progress)
                        showRestorePurchasesDialog(sku = activeSku)
                    },
                    onError = {
                        removeProgressView(progress)
                        makePurchase(sku)
                    }
            )
        }
    }

    override fun onRestoreClicked() {
        val progress = addProgressView()
        checkExistingPurchases(
                onSuccess = { activeSku ->
                    removeProgressView(progress)
                    enableFeatures(activeSku)
                    Toast.makeText(context, getString(R.string.restore_subscription_success),
                            Toast.LENGTH_LONG).show()
                },
                onError = {
                    removeProgressView(progress)
                    Toast.makeText(context, R.string.restore_subscription_error_msg,
                            Toast.LENGTH_LONG).show()
                }
        )
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
                    Toast.makeText(context,
                            getString(R.string.purchase_message_complete),
                            Toast.LENGTH_SHORT).show()
                }
        )
    }

    private fun enableFeatures(sku: String) {
        when (sku) {
            Products.BASIC_PLUS_VPN -> {
                purchasesManager.purchase.isVpnEnabled = true
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            Products.BASIC -> {
                purchasesManager.purchase.isVpnEnabled = false
                purchasesManager.purchase.isDashboardEnabled = true
                preferenceManager.isAttrackEnabled = true
                preferenceManager.adBlockEnabled = true
            }
            Products.VPN -> {
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
        Products.BASIC -> ProductName.BASIC
        Products.VPN -> ProductName.VPN
        Products.BASIC_PLUS_VPN -> ProductName.BASIC_VPN
        else -> IllegalArgumentException("Invalid product id $sku")
    }

    private fun addProgressView(): View {
        val contentView = view?.rootView?.findViewById<ViewGroup>(android.R.id.content)
        val progress = LayoutInflater.from(context)
                .inflate(R.layout.fullscreen_progress, contentView, false)
        contentView?.addView(progress)
        return progress
    }

    private fun removeProgressView(progress: View) {
        val contentView = view?.rootView?.findViewById<ViewGroup>(android.R.id.content)
        contentView?.removeView(progress)
    }

}
