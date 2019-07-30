package com.cliqz.browser.purchases.productlist

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cliqz.browser.R
import com.cliqz.browser.purchases.Products
import com.cliqz.browser.purchases.Products.UPGRADE_MAP
import com.cliqz.browser.purchases.PurchasesManager
import kotlinx.android.synthetic.lumen.subscription_product_row_default.view.*
import kotlinx.android.synthetic.lumen.subscription_restore_button_view.view.*

interface OnPurchaseClickListener {
    fun onBuyClicked(position: Int)
    fun onRestoreClicked()
}

const val LAYOUT_DEFAULT = 0
const val LAYOUT_HIGHLIGHTED = 1
const val LAYOUT_RESTORE_BUTTON = 2

class ProductListAdapter(private val purchasesManager: PurchasesManager,
                         private val context: Context,
                         private val onPurchaseClickListener: OnPurchaseClickListener) :
        RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private var subscription: ProductRowData? = null

    private var mListData = emptyList<ProductRowData>()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        return when (viewType) {
            LAYOUT_DEFAULT -> {
                ProductRowViewHolder(LayoutInflater.from(parent.context)
                        .inflate(R.layout.subscription_product_row_default, parent, false))
            }
            LAYOUT_HIGHLIGHTED -> {
                ProductRowViewHolder(LayoutInflater.from(parent.context)
                        .inflate(R.layout.subscription_product_row_highlighted, parent, false))
            }
            LAYOUT_RESTORE_BUTTON -> {
                RestoreSubscriptionViewHolder(LayoutInflater.from(parent.context)
                        .inflate(R.layout.subscription_restore_button_view, parent, false))
            }
            else -> throw IllegalArgumentException("Invalid viewType for ProductListAdapter")
        }
    }

    override fun getItemCount(): Int {
        return mListData.size + if (purchasesManager.purchase.isASubscriber) 0 else 1
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        if (holder.itemViewType == LAYOUT_RESTORE_BUTTON) {
            return
        }
        (holder as ProductRowViewHolder).bindData(getProduct(position))
        if (holder.itemViewType == LAYOUT_HIGHLIGHTED) {
            val params = holder.itemView.layoutParams as RecyclerView.LayoutParams
            params.marginStart = 0
            params.marginEnd = 0
            holder.itemView.layoutParams = params
        }
    }

    override fun getItemViewType(position: Int): Int {
        return when {
            position == 3 -> LAYOUT_RESTORE_BUTTON
            mListData[position].sku == Products.BASIC_PLUS_VPN -> LAYOUT_HIGHLIGHTED
            else -> LAYOUT_DEFAULT
        }
    }

    fun getProduct(position: Int) = mListData[position]

    fun updateProductList(data: List<ProductRowData>) {
        mListData = data
    }

    fun setSubscription(subscription: ProductRowData?) {
        this.subscription = subscription
    }

    inner class ProductRowViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        init {
            itemView.buy_subscription.setOnClickListener {
                onPurchaseClickListener.onBuyClicked(adapterPosition)
            }
        }

        fun bindData(productRowData: ProductRowData?) {
            productRowData?.apply {
                itemView.title.text = title
                itemView.description.text = description
                itemView.price.text = context.getString(R.string.per_month_text, price)
                val subscription = this@ProductListAdapter.subscription
                when {
                    subscription == null -> {
                        itemView.is_subscribed?.visibility = View.GONE
                        itemView.buy_subscription.visibility = View.VISIBLE
                    }
                    this.isSubscribed -> {
                        itemView.is_subscribed?.visibility = View.VISIBLE
                        itemView.buy_subscription.visibility = View.GONE
                    }
                    UPGRADE_MAP[subscription.sku]?.contains(this.sku) ?: false -> {
                        itemView.buy_subscription.text = context.getString(R.string.upgrade_button)
                    }
                    else -> {
                        itemView.is_subscribed?.visibility = View.GONE
                        itemView.buy_subscription.visibility = View.GONE
                    }
                }
            }
        }
    }

    inner class RestoreSubscriptionViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        init {
            itemView.restore_purchase.setOnClickListener {
                onPurchaseClickListener.onRestoreClicked()
            }
        }
    }

}
