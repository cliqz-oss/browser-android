package com.cliqz.browser.purchases.productlist

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cliqz.browser.R
import com.cliqz.browser.purchases.SubscriptionConstants.ProductId
import kotlinx.android.synthetic.lumen.subscription_product_row_default.view.*

interface OnBuyClickListener {
    fun onBuyClicked(position: Int)
}

const val LAYOUT_DEFAULT = 0
const val LAYOUT_HIGHLIGHTED = 1

class ProductListAdapter(private val context: Context?,
                         private var mListData: List<ProductRowData>?,
                         private val onBuyClickListener: OnBuyClickListener) :
        RecyclerView.Adapter<ProductListAdapter.ProductRowViewHolder>() {

    private var hasSubscription = false

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductRowViewHolder {
        val layoutResource = when (viewType) {
            LAYOUT_DEFAULT -> R.layout.subscription_product_row_default
            LAYOUT_HIGHLIGHTED -> R.layout.subscription_product_row_highlighted
            else -> throw IllegalArgumentException("Invalid viewType for ProductListAdapter")
        }
        return ProductRowViewHolder(LayoutInflater.from(parent.context)
                .inflate(layoutResource, parent, false))
    }

    override fun getItemCount() = mListData?.size ?: 0

    override fun onBindViewHolder(holder: ProductRowViewHolder, position: Int) {
        holder.bindData(getProduct(position))
        if (holder.itemViewType == LAYOUT_HIGHLIGHTED) {
            val params = holder.itemView.layoutParams as RecyclerView.LayoutParams
            params.marginStart = 0
            params.marginEnd = 0
            holder.itemView.layoutParams = params
        }
    }

    override fun getItemViewType(position: Int): Int {
        return mListData?.let {
            if (it[position].sku in setOf(ProductId.BASIC_VPN, ProductId.BASIC_VPN_STAGING)) {
                LAYOUT_HIGHLIGHTED
            } else {
                LAYOUT_DEFAULT
            }
        } ?: LAYOUT_DEFAULT
    }

    fun getProduct(position: Int) = mListData?.get(position)

    fun updateProductList(data: List<ProductRowData>) {
        mListData = data
    }

    fun setHasSubscription(hasSubscription: Boolean) {
        this.hasSubscription = hasSubscription
    }

    inner class ProductRowViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        init {
            itemView.buy_subscription.setOnClickListener {
                onBuyClickListener.onBuyClicked(adapterPosition)
            }
        }

        fun bindData(productRowData: ProductRowData?) {
            productRowData?.apply {
                itemView.title.text = title
                itemView.description.text = description
                itemView.price.text = context?.getString(R.string.per_month_text, price)
                if (this@ProductListAdapter.hasSubscription) {
                    if (this.isSubscribed) {
                        itemView.is_subscribed?.visibility = View.VISIBLE
                        itemView.buy_subscription.visibility = View.GONE
                    } else {
                        itemView.buy_subscription.text = context?.getString(R.string.upgrade_button)
                    }
                } else {
                    itemView.is_subscribed?.visibility = View.GONE
                    itemView.buy_subscription.visibility = View.VISIBLE
                }
            }
        }
    }

}
