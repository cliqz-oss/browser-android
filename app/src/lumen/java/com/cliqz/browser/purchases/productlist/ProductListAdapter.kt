package com.cliqz.browser.purchases.productlist

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.cliqz.browser.R

interface OnBuyClickListener {
    fun onBuyClicked(position: Int)
}

class ProductListAdapter(private var mListData: List<ProductRowData>?,
                         private val onBuyClickListener: OnBuyClickListener) :
        RecyclerView.Adapter<ProductListAdapter.ProductRowViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProductRowViewHolder {
        return ProductRowViewHolder(LayoutInflater.from(parent.context).inflate(
                R.layout.subscription_product_row, parent, false))
    }

    override fun getItemCount() = mListData?.size ?: 0

    override fun onBindViewHolder(holder: ProductRowViewHolder, position: Int) {
        getProduct(position)?.apply {
            holder.title.text = title
            holder.description.text = description
            holder.price.text = price
        }
    }

    fun getProduct(position: Int) = mListData?.get(position)

    fun updateProductList(data: List<ProductRowData>) {
        mListData = data
    }

    inner class ProductRowViewHolder(itemView: View) :
            RecyclerView.ViewHolder(itemView) {
        var title: TextView = itemView.findViewById<View>(R.id.title) as TextView
        var description: TextView = itemView.findViewById<View>(R.id.description) as TextView
        var price: TextView = itemView.findViewById<View>(R.id.price) as TextView
        var button: Button = itemView.findViewById<View>(R.id.buy_subscription) as Button

        init {
            button.setOnClickListener { onBuyClickListener.onBuyClicked(adapterPosition) }
        }
    }

}
