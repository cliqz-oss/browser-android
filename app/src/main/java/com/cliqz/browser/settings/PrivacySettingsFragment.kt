/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings

import acr.browser.lightning.utils.WebUtils
import android.annotation.SuppressLint
import android.app.Activity
import android.content.DialogInterface
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.preference.CheckBoxPreference
import android.preference.Preference
import android.preference.PreferenceCategory
import android.provider.Settings
import androidx.appcompat.app.AlertDialog
import com.cliqz.browser.R
import com.cliqz.browser.main.Messages
import com.cliqz.browser.telemetry.TelemetryKeys
import com.cliqz.browser.utils.HistoryCleaner
import java.util.*

class PrivacySettingsFragment : BaseSettingsFragment() {

    private var mActivity: Activity? = null

    private var cbenablecookies: CheckBoxPreference? = null
    private var cbsavepasswords: CheckBoxPreference? = null
    private var cbclearexit: CheckBoxPreference? = null
    private var cbautoforget: CheckBoxPreference? = null
    private var cbattrack: CheckBoxPreference? = null
    private var cbsendusagedata: CheckBoxPreference? = null

    private var prpermissions: Preference? = null

    private var startTime: Long = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startTime = System.currentTimeMillis()
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.PRIVACY, TelemetryKeys.MAIN)
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preferences_privacy)
        mActivity = activity
        initPrefs()
    }

    private fun initPrefs() {
        cbattrack = findPreference(SETTINGS_ATTRACK) as CheckBoxPreference?
        prpermissions = findPreference(SETTINGS_APP_SETTINGS)
        cbenablecookies = findPreference(SETTINGS_ENABLECOOKIES) as CheckBoxPreference?
        cbsavepasswords = findPreference(SETTINGS_SAVEPASSWORD) as CheckBoxPreference?
        cbclearexit = findPreference(SETTINGS_CLEAR_DATA_ON_EXIT) as CheckBoxPreference?
        cbautoforget = findPreference(SETTINGS_AUTO_FORGET) as CheckBoxPreference?
        cbsendusagedata = findPreference(SETTINGS_SEND_USAGE_DATA) as CheckBoxPreference?

        cbattrack?.onPreferenceChangeListener = this
        prpermissions?.onPreferenceClickListener = this

        cbenablecookies?.onPreferenceChangeListener = this
        cbsavepasswords?.onPreferenceChangeListener = this
        cbclearexit?.onPreferenceChangeListener = this
        cbautoforget?.onPreferenceChangeListener = this
        cbsendusagedata?.onPreferenceChangeListener = this

        mPreferenceManager.apply {
            cbattrack?.isChecked = isAttrackEnabled
            cbenablecookies?.isChecked = cookiesEnabled
            cbsavepasswords?.isChecked = savePasswordsEnabled
            cbautoforget?.isChecked = isAutoForgetEnabled
            cbclearexit?.isChecked = (  closeTabsExit || clearCacheExit ||
                                        clearCookiesExitEnabled || clearHistoryExitEnabled)
        }

        findPreference(SETTINGS_CLEAR_PRIVTE_DATA)?.onPreferenceClickListener = this
        findPreference(SETTINGS_RESTORETOPSITES)?.onPreferenceClickListener = this
        findPreference(SETTINGS_CLEARFAVORITES)?.onPreferenceClickListener = this

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            (preferenceScreen.getPreference(PREFERENCE_GROUP_BROWSING_INDEX) as PreferenceCategory)
                    .removePreference(cbattrack)
        }
    }

    override fun onPreferenceClick(preference: Preference): Boolean {
        when (preference.key) {
            SETTINGS_CLEAR_PRIVTE_DATA -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_HISTORY, TelemetryKeys.PRIVACY)
                clearDataDialog()
                return true
            }
            SETTINGS_CLEARFAVORITES -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_FAVORITES, TelemetryKeys.PRIVACY)
                clearFavoritesDialog()
                return true
            }
            SETTINGS_RESTORETOPSITES -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.RESTORE_TOPSITES, TelemetryKeys.PRIVACY)
                restoreTopSitesDialog()
                return true
            }
            SETTINGS_APP_SETTINGS -> {
                val activity = activity
                val pm = activity?.packageManager
                val packageName = activity?.packageName
                val permissionsUri = if (packageName != null)
                    Uri.fromParts("package", packageName, null)
                else
                    null
                val intent = if (permissionsUri != null)
                    Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, permissionsUri)
                else
                    null
                val intentSupported = intent != null && pm != null &&
                        intent.resolveActivity(pm) != null
                if (intentSupported) {
                    startActivity(intent)
                }
                return true
            }
            else -> return false
        }
    }

    private fun clearHistoryDialog() {
        val dialogListener = DialogInterface.OnClickListener { dialog, which ->
            when (which) {
                DialogInterface.BUTTON_POSITIVE -> HistoryCleaner
                        .builder()
                        .setContext(activity)
                        .setDeleteFavorites(false)
                        .build()
                        .cleanup()
                else -> {
                }
            }
            dialog.dismiss()
        }
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setTitle(resources.getString(R.string.clear_history))
        builder.setMessage(resources.getString(R.string.dialog_history))
                .setPositiveButton(resources.getString(R.string.yes), dialogListener)
                .setNegativeButton(resources.getString(R.string.no), dialogListener)
                .show()
    }

    private fun clearFavoritesDialog() {
        val dialogListener = DialogInterface.OnClickListener { dialog, which ->
            when (which) {
                DialogInterface.BUTTON_POSITIVE -> HistoryCleaner
                        .builder()
                        .setContext(activity)
                        .setDeleteFavorites(true)
                        .build()
                        .cleanup()
                else -> {
                }
            }
            dialog.dismiss()
        }
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setTitle(resources.getString(R.string.clear_favorites))
        builder.setMessage(resources.getString(R.string.dialog_favorites))
                .setPositiveButton(resources.getString(R.string.yes), dialogListener)
                .setNegativeButton(resources.getString(R.string.no), dialogListener)
                .show()
    }

    private fun clearPasswordsDialog() {
        val dialogListener = DialogInterface.OnClickListener { _, which ->
            when (which) {
                DialogInterface.BUTTON_POSITIVE -> {
                    passwordDatabase.clearPasswords()
                    passwordDatabase.clearBlackList()
                }
                else -> {
                }
            }
        }
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setTitle(R.string.clear_passwords)
        builder.setMessage(R.string.clear_passwords_message)
                .setPositiveButton(R.string.yes, dialogListener)
                .setNegativeButton(R.string.no, dialogListener)
                .show()
    }

    private fun restoreTopSitesDialog() {
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setTitle(resources.getString(R.string.restore_top_sites))
        builder.setMessage(resources.getString(R.string.message_restore_top_sites))
                .setPositiveButton(resources.getString(R.string.action_ok)) { _, _ -> mHistoryDatabase.restoreTopSites() }
                .setNegativeButton(resources.getString(R.string.action_cancel)) { dialog, _ -> dialog.dismiss() }.show()
    }

    private fun clearDataOnExitDialog() {
        @SuppressLint("UseSparseArrays")
        val valueSet = HashMap<Int, Boolean>()
        mPreferenceManager.apply {
            valueSet[0] = closeTabsExit
            valueSet[1] = clearHistoryExitEnabled
            valueSet[2] = clearCookiesExitEnabled
            valueSet[3] = clearCacheExit
            val entries = arrayOf(mActivity!!.getString(R.string.open_tabs), mActivity!!.getString(R.string.history), mActivity!!.getString(R.string.cookies), mActivity!!.getString(R.string.cache))
            val values = booleanArrayOf(closeTabsExit, clearHistoryExitEnabled, clearCookiesExitEnabled, clearCacheExit)
            val dialogListener = DialogInterface.OnMultiChoiceClickListener { _, which, isChecked -> valueSet[which] = isChecked }
            val builder = AlertDialog.Builder(mActivity!!)
            builder.setMultiChoiceItems(entries, values, dialogListener)
                    .setPositiveButton(R.string.action_set) { _, _ ->
                        closeTabsExit = valueSet[0]!!
                        clearHistoryExitEnabled = valueSet[1]!!
                        clearCookiesExitEnabled = valueSet[2]!!
                        clearCacheExit = valueSet[3]!!
                        cbclearexit?.isChecked = valueSet[0]!! || valueSet[1]!! || valueSet[2]!! || valueSet[3]!!
                    }
                    .setNegativeButton(R.string.action_cancel) { dialog, _ -> dialog.dismiss() }
                    .show()
        }
    }

    private fun clearDataDialog() {
        val valueSet = HashMap<Int, Boolean>()
        valueSet[0] = false
        valueSet[1] = false
        valueSet[2] = false
        valueSet[3] = false
        valueSet[4] = false
        val entries = arrayOf(mActivity!!.getString(R.string.open_tabs), mActivity!!.getString(R.string.history), mActivity!!.getString(R.string.cookies), mActivity!!.getString(R.string.cache), mActivity!!.getString(R.string.clear_passwords))
        val dialogListener = DialogInterface.OnMultiChoiceClickListener { _, which, isChecked -> valueSet[which] = isChecked }
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setMultiChoiceItems(entries, null, dialogListener)
                .setPositiveButton(R.string.action_clear) { _, _ ->
                    if (valueSet[0]!!) bus.post(Messages.CloseOpenTabs())
                    if (valueSet[1]!!) mHistoryDatabase.clearHistory(false)
                    if (valueSet[2]!!) WebUtils.clearCookies(activity)
                    if (valueSet[3]!!) WebUtils.clearCache(activity)
                    if (valueSet[4]!!) {
                        passwordDatabase.clearPasswords()
                        passwordDatabase.clearBlackList()
                    }
                }
                .setNegativeButton(R.string.action_cancel) { dialog, _ -> dialog.dismiss() }
                .show()
    }

    override fun onPreferenceChange(preference: Preference, newValue: Any): Boolean {
        // switch preferences
        when (preference.key) {
            SETTINGS_ATTRACK -> {
                mPreferenceManager.isAttrackEnabled = newValue as Boolean
                cbattrack!!.isChecked = newValue
                return true
            }
            SETTINGS_ENABLECOOKIES -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE_COOKIES, TelemetryKeys.PRIVACY,
                        !(newValue as Boolean))
                mPreferenceManager.cookiesEnabled = newValue
                cbenablecookies!!.isChecked = newValue
                return true
            }
            SETTINGS_SAVEPASSWORD -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SAVE_PASSWORDS, TelemetryKeys.PRIVACY,
                        !(newValue as Boolean))
                mPreferenceManager.savePasswordsEnabled = newValue
                cbsavepasswords!!.isChecked = newValue
                if (!newValue) {
                    clearPasswordsDialog()
                }
                return true
            }
            SETTINGS_CLEAR_DATA_ON_EXIT -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_CACHE, TelemetryKeys.PRIVACY,
                        !(newValue as Boolean))
                clearDataOnExitDialog()
                return false
            }
            SETTINGS_AUTO_FORGET -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.AUTO_FORGET_TAB, TelemetryKeys.PRIVACY,
                        !(newValue as Boolean))
                mPreferenceManager.setAutoForgetModeEnabled(newValue)
                return true
            }
            SETTINGS_SEND_USAGE_DATA -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SEND_USAGE_DATA,
                        TelemetryKeys.PRIVACY, newValue as Boolean)
                mPreferenceManager.setSendUsageData(newValue)
                return true
            }
            else -> return false
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.PRIVACY, System.currentTimeMillis() - startTime)
    }

    companion object {

        private const val SETTINGS_APP_SETTINGS = "settings"
        private const val SETTINGS_ENABLECOOKIES = "allow_cookies"
        private const val SETTINGS_SAVEPASSWORD = "password"
        private const val SETTINGS_CLEAR_PRIVTE_DATA = "clear_private_data"
        private const val SETTINGS_CLEARFAVORITES = "clear_favorites"
        private const val SETTINGS_CLEAR_DATA_ON_EXIT = "clear_private_data_exit"
        private const val SETTINGS_RESTORETOPSITES = "restore_top_sites"
        private const val SETTINGS_AUTO_FORGET = "autoforget"
        private const val SETTINGS_ATTRACK = "attrack"
        private const val SETTINGS_SEND_USAGE_DATA = "send_usage_data"
        private const val PREFERENCE_GROUP_BROWSING_INDEX = 0
    }
}
