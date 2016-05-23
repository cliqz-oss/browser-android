/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.app.Activity;
import android.content.DialogInterface;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import android.support.v7.app.AlertDialog;
import android.widget.EditText;

import com.cliqz.browser.R;
import com.cliqz.browser.main.OnBoardingActivity;
import com.cliqz.browser.utils.Telemetry;

import acr.browser.lightning.constant.SearchEngines;

public class GeneralSettingsFragment extends BaseSettingsFragment {

    private static final String SETTINGS_ADS = "cb_ads";
    private static final String SETTINGS_IMAGES = "cb_images";
    private static final String SETTINGS_SEARCHENGINE = "search";
    private static final String SETTINGS_SHOWTOUR = "onboarding";
    private static final String SETTINGS_ADULT_CONTENT = "cb_adult_content";
    private static final String SETTINGS_NEWS_NOTIFICATION = "cb_news_notification";
    // private static final String SETTINGS_DRAWERTABS = "cb_drawertabs";
    // private static final String SETTINGS_BROWSER_IMPORT = "import_browser_bookmark";

    private Activity mActivity;

    private static final int API = Build.VERSION.SDK_INT;
    private Preference searchengine, showTour;
    private CheckBoxPreference cbNewNotification, cbImages, cbAdultContent, cbAds; // , cbDrawerTabs, ;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_general);
        mActivity = getActivity();
        initPrefs();
    }

    private void initPrefs() {
        // mPreferenceManager storage
        // Preference importBrowserpref = findPreference(SETTINGS_BROWSER_IMPORT);
        searchengine = findPreference(SETTINGS_SEARCHENGINE);
        showTour = findPreference(SETTINGS_SHOWTOUR);
        cbNewNotification = (CheckBoxPreference) findPreference(SETTINGS_NEWS_NOTIFICATION);
        cbAds = (CheckBoxPreference) findPreference(SETTINGS_ADS);
        cbImages = (CheckBoxPreference) findPreference(SETTINGS_IMAGES);
        cbAdultContent = (CheckBoxPreference) findPreference(SETTINGS_ADULT_CONTENT);

        // cbDrawerTabs = (CheckBoxPreference) findPreference(SETTINGS_DRAWERTABS);

        // importBrowserpref.setOnPreferenceClickListener(this);
        searchengine.setOnPreferenceClickListener(this);
        showTour.setOnPreferenceClickListener(this);
        cbNewNotification.setOnPreferenceChangeListener(this);
        cbAds.setOnPreferenceChangeListener(this);
        cbImages.setOnPreferenceChangeListener(this);
        cbAdultContent.setOnPreferenceChangeListener(this);

        // cbDrawerTabs.setOnPreferenceChangeListener(this);

        if (API >= 19) {
            mPreferenceManager.setFlashSupport(0);
        }

        // setSearchEngineSummary(mPreferenceManager.getSearchChoice());

        final int flashNum = mPreferenceManager.getFlashSupport();
        final boolean imagesBool = mPreferenceManager.getBlockImagesEnabled();
        final boolean adultBool = mPreferenceManager.getBlockAdultContent();

        cbNewNotification.setChecked(mPreferenceManager.getNewsNotificationEnabled());
        cbImages.setChecked(imagesBool);
        cbAdultContent.setChecked(adultBool);
        cbAds.setChecked(mPreferenceManager.getAdBlockEnabled());
        // cbDrawerTabs.setChecked(mPreferenceManager.getShowTabsInDrawer(true));
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
                mPreferenceManager.setSearchChoice(engines[which]);
                setSearchEngineSummary(engines[which]);
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok), null);
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
                searchDialog();
                return true;
            case SETTINGS_SHOWTOUR:
                Intent intent = new Intent(getActivity(), OnBoardingActivity.class);
                startActivity(intent);
                return true;
//            case SETTINGS_BROWSER_IMPORT:
//                try {
//                    mBookmarkManager.importBookmarksFromBrowser(getActivity());
//                } catch (Exception e) {
//                    e.printStackTrace();
//                }
//                return true;
            default:
                return false;
        }
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
            case SETTINGS_NEWS_NOTIFICATION:
                mPreferenceManager.setNewsNotificationEnabled((Boolean) newValue);
                cbNewNotification.setChecked((Boolean) newValue);
                final String action = (Boolean) newValue ? Telemetry.Action.ENABLE : Telemetry.Action.DISABLE;
                mTelemetry.sendNewsNotificationSignal(action);
                 return true;
            case SETTINGS_ADS:
                mPreferenceManager.setAdBlockEnabled((Boolean) newValue);
                cbAds.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_IMAGES:
                mPreferenceManager.setBlockImagesEnabled((Boolean) newValue);
                cbImages.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_ADULT_CONTENT:
                mPreferenceManager.setBlockAdultContent((Boolean) newValue);
                cbAdultContent.setChecked((Boolean) newValue);
                return true;
//            case  SETTINGS_DRAWERTABS:
//                mPreferenceManager.setShowTabsInDrawer((Boolean) newValue);
//                cbDrawerTabs.setChecked((Boolean) newValue);
            default:
                return false;
        }
    }
}
