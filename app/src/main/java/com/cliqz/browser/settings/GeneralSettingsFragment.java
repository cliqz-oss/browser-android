/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.app.Activity;
import android.content.DialogInterface;
import android.os.Build;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.widget.EditText;

import com.cliqz.browser.R;
import com.cliqz.browser.filechooser.FileChooserDialog;
import com.cliqz.browser.main.Countries;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.utils.TelemetryKeys;

import java.io.File;

import acr.browser.lightning.constant.SearchEngines;

public class GeneralSettingsFragment extends BaseSettingsFragment implements FileChooserDialog.FileSelectedListener {

    // private static final String SETTINGS_IMAGES = "cb_images";
    private static final String SETTINGS_SEARCHENGINE = "search";
    private static final String SETTINGS_SHOWTOUR = "onboarding";
    private static final String SETTINGS_DOWNLAOD_LOCATION = "download_location";
    private static final String SETTINGS_ADULT_CONTENT = "cb_adult_content";
    private static final String SETTINGS_AUTO_COMPLETION = "cb_autocompletion";
    private static final String SETTINGS_NEWS_NOTIFICATION = "cb_news_notification";
    private static final String SETTINGS_REGIONAL_SETTINGS = "regional_settings";
    private long startTime;

    private Activity mActivity;

    private static final int API = Build.VERSION.SDK_INT;
    private Preference searchengine;
    private Preference showTour;
    private Preference downloadLocation;
    private Preference regionalSettings;
    private CheckBoxPreference cbAdultContent;
    private CheckBoxPreference cbAutoCompletion;
    private CheckBoxPreference cbNewNotification;

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
        searchengine = findPreference(SETTINGS_SEARCHENGINE);
        showTour = findPreference(SETTINGS_SHOWTOUR);
        downloadLocation = findPreference(SETTINGS_DOWNLAOD_LOCATION);
        regionalSettings = findPreference(SETTINGS_REGIONAL_SETTINGS);
        cbNewNotification = (CheckBoxPreference) findPreference(SETTINGS_NEWS_NOTIFICATION);
        cbAdultContent = (CheckBoxPreference) findPreference(SETTINGS_ADULT_CONTENT);
        cbAutoCompletion = (CheckBoxPreference) findPreference(SETTINGS_AUTO_COMPLETION);

        searchengine.setOnPreferenceClickListener(this);
        showTour.setOnPreferenceClickListener(this);
        downloadLocation.setOnPreferenceClickListener(this);
        regionalSettings.setOnPreferenceClickListener(this);

        cbNewNotification.setOnPreferenceChangeListener(this);
        cbAdultContent.setOnPreferenceChangeListener(this);
        cbAutoCompletion.setOnPreferenceChangeListener(this);

        if (API >= 19) {
            mPreferenceManager.setFlashSupport(0);
        }

        final boolean imagesBool = mPreferenceManager.getBlockImagesEnabled();
        final boolean adultBool = mPreferenceManager.getBlockAdultContent();
        final boolean autocompleteBool = mPreferenceManager.getAutocompletionEnabled();
        final boolean newsNotificationBool = mPreferenceManager.getNewsNotificationEnabled();

        cbNewNotification.setChecked(newsNotificationBool);
        cbAdultContent.setChecked(adultBool);
        cbAutoCompletion.setChecked(autocompleteBool);
    }

    private void searchDialog() {
        final AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(R.string.complementary_search_engine);
        final SearchEngines[] engines = SearchEngines.values();
        final String[] engineNames = new String[engines.length];
        final SearchEngines selectedEngine = mPreferenceManager.getSearchChoice();
        int n = 0;
        for (int i = 0; i < engineNames.length; i++) {
            final SearchEngines engine = engines[i];
            engineNames[i] = engine.engineName;
            if (engine == selectedEngine) {
                n = i;
            }
        }

        picker.setSingleChoiceItems(engineNames, n, new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialog, int which) {
                mTelemetry.sendSettingsMenuSignal(engines[which].engineName, TelemetryKeys.SELECT_SE);
                mPreferenceManager.setSearchChoice(engines[which]);
                setSearchEngineSummary(engines[which]);
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok), new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialogInterface, int i) {
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CONFIRM, TelemetryKeys.SELECT_SE);
            }
        });
        picker.show();
    }

    private void searchUrlPicker() {
        final AlertDialog.Builder urlPicker = new AlertDialog.Builder(mActivity);
        urlPicker.setTitle(getResources().getString(R.string.custom_url));
        final EditText getSearchUrl = new EditText(mActivity);
        String mSearchUrl = mPreferenceManager.getSearchUrl();
        getSearchUrl.setText(mSearchUrl);
        urlPicker.setView(getSearchUrl);
        urlPicker.setPositiveButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String text = getSearchUrl.getText().toString();
                        mPreferenceManager.setSearchUrl(text);
                        searchengine.setSummary(getResources().getString(R.string.custom_url) + ": "
                                + text);
                    }
                });
        urlPicker.show();
    }

    private void setSearchEngineSummary(SearchEngines which) {
        searchengine.setSummary(which.engineName);
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
                OnBoardingHelper.forceShow(getActivity());
                preference.setEnabled(false);
                return true;
            case SETTINGS_DOWNLAOD_LOCATION:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.DOWNLOAD_LOCATION, TelemetryKeys.GENERAL);
                showDirectoryChooser();
                return true;
            case SETTINGS_REGIONAL_SETTINGS:
                showCountryChooser();
                return true;
            default:
                return false;
        }
    }

    private void showDirectoryChooser() {
        final File downloadPath = new File(mPreferenceManager.getDownloadDirectory());
        final FileChooserDialog dialog = new FileChooserDialog(getActivity(), downloadPath);
        dialog.setFileListener(this);
        dialog.showDialog();
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
                mTelemetry.sendNewsNotificationSignal(action, false);
                 return true;
            case SETTINGS_ADULT_CONTENT:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_EXPLICIT, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setBlockAdultContent((Boolean) newValue);
                cbAdultContent.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_AUTO_COMPLETION:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE_AUTOCOMPLETE, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setAutocompletionEnabled((Boolean) newValue);
                cbAutoCompletion.setChecked((Boolean) newValue);
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

    @Override
    public void fileSelected(File file) {
        mPreferenceManager.setDownloadDirectory(file.getAbsolutePath());
    }
}
