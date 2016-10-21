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
import android.widget.EditText;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.TelemetryKeys;
import com.cliqz.browser.main.OnBoardingHelper;

import acr.browser.lightning.constant.SearchEngines;

public class GeneralSettingsFragment extends BaseSettingsFragment {

    // private static final String SETTINGS_IMAGES = "cb_images";
    private static final String SETTINGS_SEARCHENGINE = "search";
    private static final String SETTINGS_SHOWTOUR = "onboarding";
    private static final String SETTINGS_ADULT_CONTENT = "cb_adult_content";
    private static final String SETTINGS_AUTO_COMPLETION = "cb_autocompletion";
    private long startTime;

    private Activity mActivity;

    private static final int API = Build.VERSION.SDK_INT;
    private Preference searchengine, showTour;
    // private CheckBoxPreference cbImages;
    private CheckBoxPreference cbAdultContent;
    private CheckBoxPreference cbAutoCompletion;

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
        // cbImages = (CheckBoxPreference) findPreference(SETTINGS_IMAGES);
        cbAdultContent = (CheckBoxPreference) findPreference(SETTINGS_ADULT_CONTENT);
        cbAutoCompletion = (CheckBoxPreference) findPreference(SETTINGS_AUTO_COMPLETION);

        searchengine.setOnPreferenceClickListener(this);
        showTour.setOnPreferenceClickListener(this);
        // cbImages.setOnPreferenceChangeListener(this);
        cbAdultContent.setOnPreferenceChangeListener(this);
        cbAutoCompletion.setOnPreferenceChangeListener(this);

        if (API >= 19) {
            mPreferenceManager.setFlashSupport(0);
        }

        final boolean imagesBool = mPreferenceManager.getBlockImagesEnabled();
        final boolean adultBool = mPreferenceManager.getBlockAdultContent();
        final boolean autocompleteBool = mPreferenceManager.getAutocompletionEnabled();
        // cbImages.setChecked(imagesBool);
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
            default:
                return false;
        }
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
            /* case SETTINGS_IMAGES:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_IMAGES, TelemetryKeys.GENERAL,
                        !((Boolean) newValue));
                mPreferenceManager.setBlockImagesEnabled((Boolean) newValue);
                cbImages.setChecked((Boolean) newValue);
                return true; */
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
}
