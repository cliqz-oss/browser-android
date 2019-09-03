package com.cliqz.browser.settings

import acr.browser.lightning.constant.SearchEngines
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.preference.*
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.cliqz.browser.BuildConfig
import com.cliqz.browser.R
import com.cliqz.browser.main.Countries
import com.cliqz.browser.main.MainActivity
import com.cliqz.browser.telemetry.TelemetryKeys

class GeneralSettingsFragment : BaseSettingsFragment() {

    private var startTime: Long = 0

    private var mActivity: Activity? = null
    private var searchEngine: Preference? = null
    private var cbAdultContent: CheckBoxPreference? = null
    private var cbAutoCompletion: CheckBoxPreference? = null
    private var cbNewNotification: CheckBoxPreference? = null
    private var cbQuerySuggestion: CheckBoxPreference? = null
    private var cbShowBackgroundImage: CheckBoxPreference? = null
    private var cbShowTopSites: CheckBoxPreference? = null
    private var cbShowNews: CheckBoxPreference? = null
    private var cbLimitDataUsage: CheckBoxPreference? = null
    private var cbShowMyOffrz: CheckBoxPreference? = null
    private var aboutMyOffrz: Preference? = null
    private var selectedEngineIndex = -1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        startTime = System.currentTimeMillis()
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.GENERAL, TelemetryKeys.MAIN)
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preferences_general)
        mActivity = activity
        initPrefs()
    }

    private fun initPrefs() {
        searchEngine = findPreference(SETTINGS_SEARCHENGINE)
        val showTour = findPreference(SETTINGS_SHOWTOUR)
        val regionalSettings = findPreference(SETTINGS_REGIONAL_SETTINGS)
        val subscriptionsSettigns = findPreference(SETTINGS_SUBSCRIPTIONS)

        cbNewNotification = findPreference(SETTINGS_NEWS_NOTIFICATION) as CheckBoxPreference?
        cbAdultContent = findPreference(SETTINGS_ADULT_CONTENT) as CheckBoxPreference?
        cbAutoCompletion = findPreference(SETTINGS_AUTO_COMPLETION) as CheckBoxPreference?
        cbQuerySuggestion = findPreference(SETTINGS_QUERY_SUGGESTIONS) as CheckBoxPreference?
        cbShowBackgroundImage = findPreference(SETTINGS_SHOW_BACKGROUND_IMAGE) as CheckBoxPreference?
        cbShowTopSites = findPreference(SETTINGS_SHOW_TOPSITES) as CheckBoxPreference?
        cbShowNews = findPreference(SETTINGS_SHOW_NEWS) as CheckBoxPreference?
        cbLimitDataUsage = findPreference(SETTINGS_LIMIT_DATA_USAGE) as CheckBoxPreference?
        cbShowMyOffrz = findPreference(SETTINGS_SHOW_MY_OFFRZ) as CheckBoxPreference?
        aboutMyOffrz = findPreference(SETTINGS_about_MY_OFFRZ)

        searchEngine?.onPreferenceClickListener = this
        setSearchEngineSummary(mPreferenceManager.searchChoice)
        showTour?.onPreferenceClickListener = this
        regionalSettings?.onPreferenceClickListener = this
        subscriptionsSettigns?.onPreferenceClickListener = this
        aboutMyOffrz?.onPreferenceClickListener = this

        cbNewNotification?.onPreferenceChangeListener = this
        cbAdultContent?.onPreferenceChangeListener = this
        cbAutoCompletion?.onPreferenceChangeListener = this
        cbQuerySuggestion?.onPreferenceChangeListener = this
        cbShowBackgroundImage?.onPreferenceChangeListener = this
        cbShowTopSites?.onPreferenceChangeListener = this
        cbShowNews?.onPreferenceChangeListener = this
        cbLimitDataUsage?.onPreferenceChangeListener = this
        cbShowMyOffrz?.onPreferenceChangeListener = this

        if (API >= 19) {
            mPreferenceManager.flashSupport = 0
        }

       mPreferenceManager.apply {
            cbNewNotification?.isChecked = newsNotificationEnabled
            cbAdultContent?.isChecked = blockAdultContent
            cbAutoCompletion?.isChecked = autocompletionEnabled
            cbQuerySuggestion?.isChecked = querySuggestionEnabled
            cbShowBackgroundImage?.isChecked = isBackgroundImageEnabled
            cbShowTopSites?.isChecked = shouldShowTopSites()
            cbShowNews?.isChecked = shouldShowNews()
            cbLimitDataUsage?.isChecked = shouldLimitDataUsage()
            cbShowMyOffrz?.isChecked = isMyOffrzEnable
        }

        if (mPreferenceManager.countryChoice != Countries.germany && cbQuerySuggestion != null) {
            removePreference(cbQuerySuggestion)
        }

        if (!BuildConfig.DEBUG) {
            removePreference(showTour)
        }
    }

    private fun removePreference(preference: Preference?) {
        if (preference == null) return
        removePreference(preferenceScreen, preference)
    }

    private fun removePreference(group: PreferenceGroup, preference: Preference) {
        val toBeRemoved = mutableListOf<Preference>()
        for (i in 0 until group.preferenceCount) {
            val current = group.getPreference(i)
            if (current is PreferenceGroup) {
                removePreference(current, preference)
            } else if (current == preference) {
                toBeRemoved += preference
            }
        }
        toBeRemoved.map(group::removePreference)
    }

    private fun searchDialog() {
        val picker = AlertDialog.Builder(mActivity!!)
        picker.setTitle(R.string.complementary_search_engine)
        val engines = SearchEngines.values()
        val engineNames = arrayOfNulls<String>(engines.size)
        val selectedEngine = mPreferenceManager.searchChoice
        engineNames.indices.forEach { i ->
            val engine = engines[i]
            engineNames[i] = engine.engineName
            if (engine == selectedEngine) {
                selectedEngineIndex = i
            }
        }
        val preSelEngineIdx = selectedEngineIndex
        picker.setSingleChoiceItems(engineNames, preSelEngineIdx) { _, which ->
            mTelemetry.sendSettingsMenuSignal(engines[which].engineName, TelemetryKeys.SELECT_SE)
            selectedEngineIndex = which
        }
        picker.setNeutralButton(resources.getString(R.string.action_ok)) { _, _ ->
            if (preSelEngineIdx != selectedEngineIndex) {
                mPreferenceManager.searchChoice = engines[selectedEngineIndex]
                setSearchEngineSummary(engines[selectedEngineIndex])
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CONFIRM, TelemetryKeys.SELECT_SE)
            }
        }
        picker.show()
    }

    private fun setSearchEngineSummary(which: SearchEngines) {
        searchEngine!!.summary = which.engineName
    }

    override fun onPreferenceClick(preference: Preference): Boolean {
        when (preference.key) {
            SETTINGS_SEARCHENGINE -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SEARCH_ENGINE, TelemetryKeys.GENERAL)
                searchDialog()
                return true
            }
            SETTINGS_SHOWTOUR -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_TOUR, TelemetryKeys.GENERAL)
                mPreferenceManager.setAllOnBoardingPreferences(true)
                preference.isEnabled = false
                return true
            }
            SETTINGS_REGIONAL_SETTINGS -> {
                showCountryChooser()
                return true
            }
            SETTINGS_SUBSCRIPTIONS -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.RESET_SUBSCRIPTIONS, TelemetryKeys.GENERAL)
                showResetSubscriptionsDialog()
                return true
            }
            SETTINGS_about_MY_OFFRZ -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ABOUT_MYOFFRZ, TelemetryKeys.MAIN)
                val url = getString(R.string.myoffrz_url)
                val intent = Intent(activity, MainActivity::class.java)
                intent.action = Intent.ACTION_VIEW
                intent.data = Uri.parse(url)
                startActivity(intent)
                return true
            }
            else -> return false
        }
    }

    private fun showResetSubscriptionsDialog() {
        val builder = AlertDialog.Builder(mActivity!!)
        builder.setTitle(R.string.reset_subscriptions_title)
                .setMessage(R.string.reset_subscriptions_title_msg)
                .setCancelable(true)
                .setNegativeButton(R.string.action_no) { dialog, _ -> dialog.dismiss() }
                .setPositiveButton(R.string.action_yes) { _, _ ->
                    subscriptionsManager.resetSubscriptions()
                    Toast.makeText(mActivity, R.string.subscriptions_resetted_toast,
                            Toast.LENGTH_SHORT).show()
                }
                .show()
    }

    private fun showCountryChooser() {
        val picker = AlertDialog.Builder(mActivity!!)
        picker.setTitle(R.string.regional_settings)
        val countries = Countries.values()
        val countryNames = arrayOfNulls<String>(countries.size)
        val selectedCountry = mPreferenceManager.countryChoice
        var n = 0
        for (i in countryNames.indices) {
            val country = countries[i]
            countryNames[i] = mActivity!!.getString(country.countryNameResourceId)
            if (country == selectedCountry) {
                n = i
            }
        }
        picker.setSingleChoiceItems(countryNames, n) { _, which ->
            mPreferenceManager.countryChoice = countries[which]
            if (countries[which].countryCode == Countries.germany.countryCode) {
                (preferenceScreen.getPreference(0) as PreferenceGroup)
                        .addPreference(cbQuerySuggestion)
            } else {
                (preferenceScreen.getPreference(0) as PreferenceGroup)
                        .removePreference(cbQuerySuggestion)
            }
        }
        picker.setNeutralButton(resources.getString(R.string.action_ok)) { _, _ -> }
        picker.show()
    }

    override fun onPreferenceChange(preference: Preference, newValue: Any): Boolean {
        // switch preferences
        when (preference.key) {
            SETTINGS_NEWS_NOTIFICATION -> {
                mPreferenceManager.newsNotificationEnabled = newValue as Boolean
                cbNewNotification!!.isChecked = newValue
                val action = if (newValue) TelemetryKeys.ENABLE else TelemetryKeys.DISABLE
                mTelemetry.sendNotificationSignal(action, "news", false)
                return true
            }
            SETTINGS_ADULT_CONTENT -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_EXPLICIT, TelemetryKeys.GENERAL,
                        !(newValue as Boolean))
                mPreferenceManager.blockAdultContent = newValue
                return true
            }
            SETTINGS_AUTO_COMPLETION -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE_AUTOCOMPLETE, TelemetryKeys.GENERAL,
                        !(newValue as Boolean))
                mPreferenceManager.autocompletionEnabled = newValue
                return true
            }
            SETTINGS_QUERY_SUGGESTIONS -> {
                mPreferenceManager.setQuerySuggestionEnabled(newValue as Boolean)
                return true
            }
            SETTINGS_SHOW_BACKGROUND_IMAGE -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_BACKGROUND_IMAGE,
                        TelemetryKeys.GENERAL, !(newValue as Boolean))
                mPreferenceManager.setShouldShowBackgroundImage(newValue)
                return true
            }
            SETTINGS_SHOW_TOPSITES -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_TOPSITES, TelemetryKeys.GENERAL,
                        !(newValue as Boolean))
                mPreferenceManager.setShouldShowTopSites(newValue)
                return true
            }
            SETTINGS_SHOW_NEWS -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_NEWS, TelemetryKeys.GENERAL,
                        !(newValue as Boolean))
                mPreferenceManager.setShouldShowNews(newValue)
                return true
            }
            SETTINGS_LIMIT_DATA_USAGE -> {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.LIMIT_DATA_USAGE, TelemetryKeys.GENERAL,
                        !(newValue as Boolean))
                mPreferenceManager.setLimitDataUsage(newValue)
                return true
            }
            SETTINGS_SHOW_MY_OFFRZ -> {
                mPreferenceManager.isMyOffrzEnable = newValue as Boolean
                return true
            }
            else -> return false
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.GENERAL, System.currentTimeMillis() - startTime)
    }

    companion object {

        // private static final String SETTINGS_IMAGES = "cb_images";
        private val SETTINGS_SEARCHENGINE = "search"
        private val SETTINGS_SHOWTOUR = "onboarding"
        private val SETTINGS_ADULT_CONTENT = "cb_adult_content"
        private val SETTINGS_AUTO_COMPLETION = "cb_autocompletion"
        private val SETTINGS_NEWS_NOTIFICATION = "cb_news_notification"
        private val SETTINGS_REGIONAL_SETTINGS = "regional_settings"
        private val SETTINGS_QUERY_SUGGESTIONS = "cb_query_suggestion"
        private val SETTINGS_SHOW_BACKGROUND_IMAGE = "cb_show_background_image"
        private val SETTINGS_SHOW_TOPSITES = "cb_show_topsites"
        private val SETTINGS_SHOW_NEWS = "cb_show_news"
        private val SETTINGS_LIMIT_DATA_USAGE = "cb_limit_data_usage"
        private val SETTINGS_SUBSCRIPTIONS = "subscriptions"
        private val SETTINGS_SHOW_MY_OFFRZ = "cb_show_my_offrz"
        private val SETTINGS_about_MY_OFFRZ = "about_my_offrz"

        private val API = Build.VERSION.SDK_INT
    }
}
