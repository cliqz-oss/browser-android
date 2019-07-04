package com.cliqz.browser.controlcenter

import acr.browser.lightning.preference.PreferenceManager
import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import com.cliqz.browser.R
import com.cliqz.browser.app.BrowserApp
import com.cliqz.browser.extensions.color
import com.cliqz.browser.extensions.setDrawable
import com.cliqz.browser.extensions.tintVectorDrawable
import com.cliqz.browser.main.Messages
import com.cliqz.browser.purchases.PurchasesManager
import com.cliqz.jsengine.Insights
import com.cliqz.jsengine.ReadableMapUtils
import com.cliqz.nove.Bus
import com.cliqz.nove.Subscribe
import com.facebook.react.bridge.ReadableMap
import kotlinx.android.synthetic.lumen.bond_dashboard_fragment.*
import javax.inject.Inject

class DashboardFragment : Fragment() {

    private var isDailyView = false

    @Inject
    internal lateinit var bus: Bus

    @Inject
    internal lateinit var insights: Insights

    @Inject
    internal lateinit var purchasesManager: PurchasesManager

    @Inject
    internal lateinit var preferenceManager: PreferenceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        isDailyView = arguments?.getBoolean(ControlCenterPagerAdapter.IS_TODAY) ?: true
        BrowserApp.getActivityComponent(activity)?.inject(this)
        bus.register(this)
    }

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?,
                              savedInstanceState: Bundle?): View? {
        return inflater.inflate(R.layout.bond_dashboard_fragment, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        changeDashboardState(purchasesManager.isDashboardEnabled() &&
                preferenceManager.isAttrackEnabled && preferenceManager.adBlockEnabled)
        reset.setOnClickListener {
            if (!preferenceManager.isAttrackEnabled && !preferenceManager.adBlockEnabled) {
                return@setOnClickListener
            }
            android.app.AlertDialog.Builder(it.context)
                    .setTitle(R.string.bond_dashboard_clear_dialog_title)
                    .setMessage(R.string.bond_dashboard_clear_dialog_message)
                    .setPositiveButton(R.string.button_ok) { _, _ ->
                        bus.post(Messages.ClearDashboardData())
                    }
                    .setNegativeButton(R.string.cancel, null)
                    .show()
        }
        updateUI()
    }

    fun getTitle(): String {
        return if (isDailyView) {
            context!!.getString(R.string.bond_dashboard_today_title)
        } else {
            context!!.getString(R.string.bond_dashboard_week_title)
        }
    }

    fun updateUI() {
        val periodType = if (isDailyView) "day" else "week"
        insights.getInsightsData({
            view?.post {
                updateViews(it.getMap("result"))
            }
        }, periodType)
    }

    fun refreshUIComponent(optionValue: Boolean) {
        changeDashboardState(optionValue)
    }

    private fun updateViews(data: ReadableMap?) {
        if (data == null) return

        val dataSaved: MeasurementWrapper
        val adsBlocked: MeasurementWrapper
        val trackersDetected: MeasurementWrapper
        val pagesVisited: MeasurementWrapper

        if (purchasesManager.isDashboardEnabled() &&
                preferenceManager.adBlockEnabled && preferenceManager.isAttrackEnabled) {
            dataSaved = ValuesFormatterUtil.formatBytesCount(ReadableMapUtils.getSafeInt(data, "dataSaved"))
            adsBlocked = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data, "adsBlocked"))
            trackersDetected = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data, "trackersDetected"))
            pagesVisited = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data, "pages"))
        } else {
            dataSaved = ValuesFormatterUtil.formatBytesCount(0)
            adsBlocked = ValuesFormatterUtil.formatBlockCount(0)
            trackersDetected = ValuesFormatterUtil.formatBlockCount(0)
            pagesVisited = ValuesFormatterUtil.formatBlockCount(0)
        }

        ads_blocked.text = adsBlocked.value
        trackers_detected.text = trackersDetected.value
        data_saved.text = dataSaved.value
        phishing_checked.text = pagesVisited.value

        data_saved_icon.setDrawable(when (dataSaved.unit) {
            R.string.bond_dashboard_units_kb -> R.drawable.ic_kb_data_saved_on
            R.string.bond_dashboard_units_mb -> R.drawable.ic_mb_data_saved_on
            R.string.bond_dashboard_units_gb -> R.drawable.ic_gb_data_saved_on
            else -> throw IllegalArgumentException("Wrong unit for 'data saved' data")
        })
    }

    private fun changeDashboardState(isEnabled: Boolean) {
        if (isEnabled) {
            ads_blocked_icon.clearColorFilter()
            trackers_detected_icon.clearColorFilter()
            data_saved_icon.clearColorFilter()
            phishing_checked_icon.clearColorFilter()
            context?.apply {
                ads_blocked.setTextColor(Color.WHITE)
                trackers_detected.setTextColor(Color.WHITE)
                data_saved.setTextColor(Color.WHITE)
                phishing_checked.setTextColor(Color.WHITE)

                ads_blocked_text.setTextColor(Color.WHITE)
                trackers_detected_text.setTextColor(Color.WHITE)
                data_saved_text.setTextColor(Color.WHITE)
                phishing_checked_text.setTextColor(Color.WHITE)

                reset.setTextColor(color(R.color.lumen_color_blue_primary))

                vertical_line.setBackgroundColor(color(R.color.lumen_color_blue_primary_opaque))
                horizontal_line.setBackgroundColor(color(R.color.lumen_color_blue_primary_opaque))
            }
        } else {
            ads_blocked_icon.tintVectorDrawable(R.color.lumen_color_grey_text)
            trackers_detected_icon.tintVectorDrawable(R.color.lumen_color_grey_text)
            data_saved_icon.tintVectorDrawable(R.color.lumen_color_grey_text)
            phishing_checked_icon.tintVectorDrawable(R.color.lumen_color_grey_text)
            context?.apply {
                ads_blocked.setTextColor(color(R.color.lumen_color_grey_text))
                trackers_detected.setTextColor(color(R.color.lumen_color_grey_text))
                data_saved.setTextColor(color(R.color.lumen_color_grey_text))
                phishing_checked.setTextColor(color(R.color.lumen_color_grey_text))

                ads_blocked_text.setTextColor(color(R.color.lumen_color_grey_text))
                trackers_detected_text.setTextColor(color(R.color.lumen_color_grey_text))
                data_saved_text.setTextColor(color(R.color.lumen_color_grey_text))
                phishing_checked_text.setTextColor(color(R.color.lumen_color_grey_text))

                reset.setTextColor(color(R.color.lumen_color_grey_text))

                vertical_line.setBackgroundColor(color(R.color.lumen_color_grey_text))
                horizontal_line.setBackgroundColor(color(R.color.lumen_color_grey_text))
            }
        }
    }

    @Subscribe
    internal fun onPurchaseCompleted(purchaseCompleted: Messages.PurchaseCompleted) {
        if (purchasesManager.purchase.isDashboardEnabled) {
            bus.post(Messages.EnableAdBlock())
            bus.post(Messages.EnableAttrack())
            changeDashboardState(true)
        }
    }

}