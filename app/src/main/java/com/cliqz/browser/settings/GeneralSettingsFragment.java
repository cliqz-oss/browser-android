/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import android.preference.PreferenceCategory;
import android.preference.PreferenceGroup;
import android.support.v7.app.AlertDialog;
import android.widget.Toast;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.main.Countries;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.telemetry.TelemetryKeys;

import acr.browser.lightning.constant.SearchEngines;

import static android.app.AlertDialog.OnClickListener;

public class GeneralSettingsFragment extends BaseSettingsFragment {

    // private static final String SETTINGS_IMAGES = "cb_images";
    private static final String SETTINGS_SEARCHENGINE = "search";
    private static final String SETTINGS_SHOWTOUR = "onboarding";
    private static final String SETTINGS_ADULT_CONTENT = "cb_adult_content";
    private static final String SETTINGS_AUTO_COMPLETION = "cb_autocompletion";
    private static final String SETTINGS_NEWS_NOTIFICATION = "cb_news_notification";
    private static final String SETTINGS_REGIONAL_SETTINGS = "regional_settings";
    private static final String SETTINGS_QUERY_SUGGESTIONS = "cb_query_suggestion";
    private static final String SETTINGS_SHOW_BACKGROUND_IMAGE = "cb_show_background_image";
    private static final String SETTINGS_SHOW_TOPSITES = "cb_show_topsites";
    private static final String SETTINGS_SHOW_NEWS = "cb_show_news";
    private static final String SETTINGS_LIMIT_DATA_USAGE = "cb_limit_data_usage";
    private static final String SETTINGS_SUBSCRIPTIONS = "subscriptions";
    private static final String SETTINGS_SHOW_MY_OFFRZ = "cb_show_my_offrz";
    private static final String SETTINGS_about_MY_OFFRZ = "about_my_offrz";

    private long startTime;

    private Activity mActivity;

    private static final int API = Build.VERSION.SDK_INT;
    private Preference searchEngine;
    private CheckBoxPreference cbAdultContent;
    private CheckBoxPreference cbAutoCompletion;
    private CheckBoxPreference cbNewNotification;
    private CheckBoxPreference cbQuerySuggestion;
    private CheckBoxPreference cbShowBackgroundImage;
    private CheckBoxPreference cbShowTopSites;
    private CheckBoxPreference cbShowNews;
    private CheckBoxPreference cbLimitDataUsage;
    private CheckBoxPreference cbShowMyOffrz;
    private Preference aboutMyOffrz;
    private int selectedEngineIndex = -1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.GENERAL, TelemetryKeys.MAIN);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_general);
        mActivity = getActivity();
        initPrefs();
    }

    private void initPrefs() {
        searchEngine = findPreference(SETTINGS_SEARCHENGINE);
        Preference showTour = findPreference(SETTINGS_SHOWTOUR);
        Preference regionalSettings = findPreference(SETTINGS_REGIONAL_SETTINGS);
        Preference subscriptionsSettigns = findPreference(SETTINGS_SUBSCRIPTIONS);

        cbNewNotification = (CheckBoxPreference) findPreference(SETTINGS_NEWS_NOTIFICATION);
        cbAdultContent = (CheckBoxPreference) findPreference(SETTINGS_ADULT_CONTENT);
        cbAutoCompletion = (CheckBoxPreference) findPreference(SETTINGS_AUTO_COMPLETION);
        cbQuerySuggestion = (CheckBoxPreference) findPreference(SETTINGS_QUERY_SUGGESTIONS);
        cbShowBackgroundImage = (CheckBoxPreference) findPreference(SETTINGS_SHOW_BACKGROUND_IMAGE);
        cbShowTopSites = (CheckBoxPreference) findPreference(SETTINGS_SHOW_TOPSITES);
        cbShowNews = (CheckBoxPreference) findPreference(SETTINGS_SHOW_NEWS);
        cbLimitDataUsage = (CheckBoxPreference) findPreference(SETTINGS_LIMIT_DATA_USAGE);
        cbShowMyOffrz = (CheckBoxPreference) findPreference(SETTINGS_SHOW_MY_OFFRZ);
        aboutMyOffrz = findPreference(SETTINGS_about_MY_OFFRZ);

        searchEngine.setOnPreferenceClickListener(this);
        setSearchEngineSummary(mPreferenceManager.getSearchChoice());
        showTour.setOnPreferenceClickListener(this);
        regionalSettings.setOnPreferenceClickListener(this);
        subscriptionsSettigns.setOnPreferenceClickListener(this);
        aboutMyOffrz.setOnPreferenceClickListener(this);

        cbNewNotification.setOnPreferenceChangeListener(this);
        cbAdultContent.setOnPreferenceChangeListener(this);
        cbAutoCompletion.setOnPreferenceChangeListener(this);
        cbQuerySuggestion.setOnPreferenceChangeListener(this);
        cbShowBackgroundImage.setOnPreferenceChangeListener(this);
        cbShowTopSites.setOnPreferenceChangeListener(this);
        cbShowNews.setOnPreferenceChangeListener(this);
        cbLimitDataUsage.setOnPreferenceChangeListener(this);
        cbShowMyOffrz.setOnPreferenceChangeListener(this);

        if (API >= 19) {
            mPreferenceManager.setFlashSupport(0);
        }

        final boolean adultBool = mPreferenceManager.getBlockAdultContent();
        final boolean autocompleteBool = mPreferenceManager.getAutocompletionEnabled();
        final boolean newsNotificationBool = mPreferenceManager.getNewsNotificationEnabled();
        final boolean querySuggestionBool = mPreferenceManager.getQuerySuggestionEnabled();
        final boolean showBackgroundImage = mPreferenceManager.isBackgroundImageEnabled();
        final boolean showTopSitesBool = mPreferenceManager.shouldShowTopSites();
        final boolean showNewsBool = mPreferenceManager.shouldShowNews();
        final boolean limitDataUsageBool = mPreferenceManager.shouldLimitDataUsage();
        final boolean showMyOffrz = mPreferenceManager.isMyOffrzEnable();

        cbNewNotification.setChecked(newsNotificationBool);
        cbAdultContent.setChecked(adultBool);
        cbAutoCompletion.setChecked(autocompleteBool);
        cbQuerySuggestion.setChecked(querySuggestionBool);
        cbShowBackgroundImage.setChecked(showBackgroundImage);
        cbShowTopSites.setChecked(showTopSitesBool);
        cbShowNews.setChecked(showNewsBool);
        cbLimitDataUsage.setChecked(limitDataUsageBool);
        cbShowMyOffrz.setChecked(showMyOffrz);

        if (!mPreferenceManager.getCountryChoice().equals(Countries.germany)) {
            ((PreferenceCategory) getPreferenceScreen().getPreference(0))
                    .removePreference(cbQuerySuggestion);
        }

        if (!BuildConfig.DEBUG) {
            ((PreferenceCategory) getPreferenceScreen().getPreference(3))
                    .removePreference(showTour);
        }
    }

    private void searchDialog() {
        final AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(R.string.complementary_search_engine);
        final SearchEngines[] engines = SearchEngines.values();
        final String[] engineNames = new String[engines.length];
        final SearchEngines selectedEngine = mPreferenceManager.getSearchChoice();
        for (int i = 0; i < engineNames.length; i++) {
            final SearchEngines engine = engines[i];
            engineNames[i] = engine.engineName;
            if (engine == selectedEngine) {
                selectedEngineIndex = i;
            }
        }
        final int preSelEngineIdx = selectedEngineIndex;
        picker.setSingleChoiceItems(engineNames, preSelEngineIdx, new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialog, int which) {
                mTelemetry.sendSettingsMenuSignal(engines[which].engineName, TelemetryKeys.SELECT_SE);
                selectedEngineIndex = which;
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok), new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                if(preSelEngineIdx != selectedEngineIndex) {
                    mPreferenceManager.setSearchChoice(engines[selectedEngineIndex]);
                    setSearchEngineSummary(engines[selectedEngineIndex]);
                    mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CONFIRM, TelemetryKeys.SELECT_SE);
                }
            }
        });
        picker.show();
    }

    private void setSearchEngineSummary(SearchEngines which) {
        searchEngine.setSummary(which.engineName);
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        switch (preference.getKey()) {
            case SETTINGS_SEARCHENGINE:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SEARCH_ENGINE, TelemetryKeys.GENERAL);
                searchDialog();
                return true;
            case SETTINGS_SHOWTOUR:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_TOUR, TelemetryKeys.GENERAL);
                mPreferenceManager.setAllOnBoardingPreferences(true);
                preference.setEnabled(false);
                return true;
            case SETTINGS_REGIONAL_SETTINGS:
                showCountryChooser();
                return true;
            case SETTINGS_SUBSCRIPTIONS:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.RESET_SUBSCRIPTIONS, TelemetryKeys.GENERAL);
                showResetSubscriptionsDialog();
                return true;
            case SETTINGS_about_MY_OFFRZ:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ABOUT_MYOFFRZ, TelemetryKeys.MAIN);
                final String url = getString(R.string.myoffrz_url);
                final Intent intent = new Intent(getActivity(), MainActivity.class);
                intent.setAction(Intent.ACTION_VIEW);
                intent.setData(Uri.parse(url));
                startActivity(intent);
                return true;
            default:
                return false;
        }
    }

    private void showResetSubscriptionsDialog() {
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setTitle(R.string.reset_subscriptions_title)
                .setMessage(R.string.reset_subscriptions_title_msg)
                .setCancelable(true)
                .setNegativeButton(R.string.action_no, new OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                    }
                })
                .setPositiveButton(R.string.action_yes, new OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        subscriptionsManager.resetSubscriptions();
                        Toast.makeText(mActivity, R.string.subscriptions_resetted_toast,
                                Toast.LENGTH_SHORT).show();
                    }
                })
                .show();
    }

    private void showCountryChooser() {
        final AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(R.string.regional_settings);
        final Countries[] countries = Countries.values();
        final String[] countryNames = new String[countries.length];
        final Countries selectedCountry = mPreferenceManager.getCountryChoice();
        int n = 0;
        for (int i = 0; i < countryNames.length; i++) {
            final Countries country = countries[i];
            countryNames[i] = mActivity.getString(country.countryNameResourceId);
            if (country == selectedCountry) {
                n = i;
            }
        }
        picker.setSingleChoiceItems(countryNames, n, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                mPreferenceManager.setCountryChoice(countries[which]);
                if (countries[which].countryCode.equals(Countries.germany.countryCode)) {
                    ((PreferenceGroup)getPreferenceScreen().getPreference(0))
                            .addPreference(cbQuerySuggestion);
                } else {
                    ((PreferenceGroup)getPreferenceScreen().getPreference(0))
                            .removePreference(cbQuerySuggestion);
                }
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok), new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
            }
        });
        picker.show();
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
            case SETTINGS_NEWS_NOTIFICATION:
                mPreferenceManager.setNewsNotificationEnabled((Boolean) newValue);
                cbNewNotification.setChecked((Boolean) newValue);
                final String action = (Boolean) newValue ? TelemetryKeys.ENABLE : TelemetryKeys.DISABLE;
                mTelemetry.sendNotificationSignal(action, "news", false);
                 return true;
            case SETTINGS_ADULT_CONTENT:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_EXPLICIT, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setBlockAdultContent((Boolean) newValue);
                return true;
            case SETTINGS_AUTO_COMPLETION:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE_AUTOCOMPLETE, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setAutocompletionEnabled((Boolean) newValue);
                return true;
            case SETTINGS_QUERY_SUGGESTIONS:
                mPreferenceManager.setQuerySuggestionEnabled((Boolean) newValue);
                return true;
            case SETTINGS_SHOW_BACKGROUND_IMAGE:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_BACKGROUND_IMAGE,
                        TelemetryKeys.GENERAL, !((Boolean) newValue));
                mPreferenceManager.setShouldShowBackgroundImage((Boolean) newValue);
                return true;
            case SETTINGS_SHOW_TOPSITES:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_TOPSITES, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setShouldShowTopSites((Boolean) newValue);
                return true;
            case SETTINGS_SHOW_NEWS:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SHOW_NEWS, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setShouldShowNews((Boolean) newValue);
                return true;
            case SETTINGS_LIMIT_DATA_USAGE:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.LIMIT_DATA_USAGE, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setLimitDataUsage((Boolean) newValue);
                return true;
            case SETTINGS_SHOW_MY_OFFRZ:
                mPreferenceManager.setMyOffrzEnable((Boolean) newValue);
                return true;
            default:
                return false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.GENERAL, System.currentTimeMillis() - startTime);
    }
}
