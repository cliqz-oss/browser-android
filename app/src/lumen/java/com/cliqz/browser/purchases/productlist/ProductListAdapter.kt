package com.cliqz.browser.purchases.productlist

import android.content.Context
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.cliqz.browser.R
import com.cliqz.browser.purchases.Products
import com.cliqz.browser.purchases.Products.UPGRADE_MAP
import kotlinx.android.synthetic.lumen.subscription_product_row_default.view.*

interface OnBuyClickListener {
    fun onBuyClicked(position: Int)
}

const val LAYOUT_DEFAULT = 0
const val LAYOUT_HIGHLIGHTED = 1

class ProductListAdapter(private val context: Context?,
                         private val onBuyClickListener: OnBuyClickListener) :
        RecyclerView.Adapter<ProductListAdapter.ProductRowViewHolder>() {

    private var subscription: ProductRowData? = null

    private var mListData = emptyList<ProductRowData>()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductRowViewHolder {
        val layoutResource = when (viewType) {
            LAYOUT_DEFAULT -> R.layout.subscription_product_row_default
            LAYOUT_HIGHLIGHTED -> R.layout.subscription_product_row_highlighted
            else -> throw IllegalArgumentException("Invalid viewType for ProductListAdapter")
        }
        return ProductRowViewHolder(LayoutInflater.from(parent.context)
                .inflate(layoutResource, parent, false))
    }

    override fun getItemCount() = mListData.size

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
        return if (mListData[position].sku == Products.BASIC_PLUS_VPN) {
                LAYOUT_HIGHLIGHTED
            } else {
                LAYOUT_DEFAULT
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
                onBuyClickListener.onBuyClicked(adapterPosition)
            }
        }

        fun bindData(productRowData: ProductRowData?) {
            productRowData?.apply {
                itemView.title.text = title.removeSuffix(" (Lumen Browser)")
                itemView.description.text = description
                itemView.price.text = context?.getString(R.string.per_month_text, price)
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
                        itemView.buy_subscription.text = context?.getString(R.string.upgrade_button)
                    }
                    else -> {
                        itemView.is_subscribed?.visibility = View.GONE
                        itemView.buy_subscription.visibility = View.GONE
                    }
                }
            }
        }
    }

}
