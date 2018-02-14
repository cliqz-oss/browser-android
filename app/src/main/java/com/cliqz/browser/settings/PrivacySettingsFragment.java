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
import android.preference.PreferenceCategory;
import android.support.v7.app.AlertDialog;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.utils.HistoryCleaner;

import java.util.HashMap;

public class PrivacySettingsFragment extends BaseSettingsFragment {

    private static final String SETTINGS_LOCATION = "location";
    private static final String SETTINGS_ENABLECOOKIES = "allow_cookies";
    private static final String SETTINGS_SAVEPASSWORD = "password";
    private static final String SETTINGS_CLEARHISTORY = "clear_history";
    private static final String SETTINGS_CLEARFAVORITES = "clear_favorites";
    private static final String SETTINGS_CLEAR_DATA_ON_EXIT = "clear_private_data_exit";
    private static final String SETTINGS_RESTORETOPSITES = "restore_top_sites";
    private static final String SETTINGS_AUTO_FORGET = "autoforget";
    private static final String SETTINGS_ATTRACK = "attrack";

    private static final int PREFERENCE_GROUP_BROWSING_INDEX = 0;
    private static final int PREFERENCE_GROUP_CLEAR_DATA_INDEX = 1;

    private Activity mActivity;

    @SuppressWarnings("FieldCanBeLocal")
    private CheckBoxPreference cblocation, cbenablecookies, cbsavepasswords, cbclearexit,
            cbautoforget, cbattrack;

    private long startTime;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.PRIVACY, TelemetryKeys.MAIN);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_privacy);
        mActivity = getActivity();
        initPrefs();
    }

    private void initPrefs() {
        cbattrack = (CheckBoxPreference) findPreference(SETTINGS_ATTRACK);
        cblocation = (CheckBoxPreference) findPreference(SETTINGS_LOCATION);
        cbenablecookies = (CheckBoxPreference) findPreference(SETTINGS_ENABLECOOKIES);
        cbsavepasswords = (CheckBoxPreference) findPreference(SETTINGS_SAVEPASSWORD);
        cbclearexit = (CheckBoxPreference) findPreference(SETTINGS_CLEAR_DATA_ON_EXIT);
        cbautoforget = (CheckBoxPreference) findPreference(SETTINGS_AUTO_FORGET);

        cbattrack.setOnPreferenceChangeListener(this);
        cblocation.setOnPreferenceChangeListener(this);
        cbenablecookies.setOnPreferenceChangeListener(this);
        cbsavepasswords.setOnPreferenceChangeListener(this);
        cbclearexit.setOnPreferenceChangeListener(this);
        cbautoforget.setOnPreferenceChangeListener(this);

        cbattrack.setChecked(mPreferenceManager.isAttrackEnabled());
        cblocation.setChecked(mPreferenceManager.getLocationEnabled());
        cbenablecookies.setChecked(mPreferenceManager.getCookiesEnabled());
        cbsavepasswords.setChecked(mPreferenceManager.getSavePasswordsEnabled());
        cbautoforget.setChecked(mPreferenceManager.isAutoForgetEnabled());
        cbclearexit.setChecked(mPreferenceManager.getCloseTabsExit()
                || mPreferenceManager.getClearCacheExit()
                || mPreferenceManager.getClearCookiesExitEnabled()
                || mPreferenceManager.getClearHistoryExitEnabled());

        final Preference prefClearHistory = findPreference(SETTINGS_CLEARHISTORY);
        prefClearHistory.setOnPreferenceClickListener(this);
        final Preference restoreTopSites = findPreference(SETTINGS_RESTORETOPSITES);
        restoreTopSites.setOnPreferenceClickListener(this);
        final Preference prefClearFavorites = findPreference(SETTINGS_CLEARFAVORITES);
        prefClearFavorites.setOnPreferenceClickListener(this);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            ((PreferenceCategory) getPreferenceScreen().getPreference(PREFERENCE_GROUP_BROWSING_INDEX))
                    .removePreference(cbattrack);
        }
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        switch (preference.getKey()) {
            case SETTINGS_CLEARHISTORY:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_HISTORY, TelemetryKeys.PRIVACY);
                clearHistoryDialog();
                return true;
            case SETTINGS_CLEARFAVORITES:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_FAVORITES, TelemetryKeys.PRIVACY);
                clearFavoritesDialog();
                return true;
            case SETTINGS_RESTORETOPSITES:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.RESTORE_TOPSITES, TelemetryKeys.PRIVACY);
                restoreTopSitesDialog();
                return true;
            default:
                return false;
        }
    }

    private void clearHistoryDialog() {
        final DialogInterface.OnClickListener dialogListener = new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                switch (which) {
                    case DialogInterface.BUTTON_POSITIVE:
                        HistoryCleaner
                                .builder()
                                .setContext(getActivity())
                                .setDeleteFavorites(false)
                                .build()
                                .cleanup();
                        break;
                    default:
                        break;
                }
                dialog.dismiss();
            }
        };
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setTitle(getResources().getString(R.string.clear_history));
        builder.setMessage(getResources().getString(R.string.dialog_history))
                .setPositiveButton(getResources().getString(R.string.yes), dialogListener)
                .setNegativeButton(getResources().getString(R.string.no), dialogListener)
                .show();
    }

    private void clearFavoritesDialog() {
        final DialogInterface.OnClickListener dialogListener = new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                switch (which) {
                    case DialogInterface.BUTTON_POSITIVE:
                        HistoryCleaner
                                .builder()
                                .setContext(getActivity())
                                .setDeleteFavorites(true)
                                .build()
                                .cleanup();
                        break;
                    default:
                        break;
                }
                dialog.dismiss();
            }
        };
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setTitle(getResources().getString(R.string.clear_favorites));
        builder.setMessage(getResources().getString(R.string.dialog_favorites))
                .setPositiveButton(getResources().getString(R.string.yes), dialogListener)
                .setNegativeButton(getResources().getString(R.string.no), dialogListener)
                .show();
    }

    private void clearPasswordsDialog() {
        final DialogInterface.OnClickListener dialogListener = new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                switch (which) {
                    case DialogInterface.BUTTON_POSITIVE:
                        passwordDatabase.clearPasswords();
                        break;
                    default:
                        break;
                }
            }
        };
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setTitle(R.string.clear_passwords);
        builder.setMessage(R.string.clear_passwords_message)
                .setPositiveButton(R.string.yes, dialogListener)
                .setNegativeButton(R.string.no, dialogListener)
                .show();
    }

    private void restoreTopSitesDialog() {
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setTitle(getResources().getString(R.string.restore_top_sites));
        builder.setMessage(getResources().getString(R.string.message_restore_top_sites))
                .setPositiveButton(getResources().getString(R.string.action_ok), new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        mHistoryDatabase.restoreTopSites();
                    }
                })
                .setNegativeButton(getResources().getString(R.string.action_cancel), new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                    }
                }).show();
    }

    private void clearDataDialog() {
        final HashMap<Integer, Boolean> valueSet = new HashMap<>();
        valueSet.put(0, mPreferenceManager.getCloseTabsExit());
        valueSet.put(1, mPreferenceManager.getClearHistoryExitEnabled());
        valueSet.put(2, mPreferenceManager.getClearCookiesExitEnabled());
        valueSet.put(3, mPreferenceManager.getClearCacheExit());
        final String[] entries = new String[]{
                mActivity.getString(R.string.open_tabs),
                mActivity.getString(R.string.history),
                mActivity.getString(R.string.cookies),
                mActivity.getString(R.string.cache)
        };
        final boolean[] values = new boolean[]{
                mPreferenceManager.getCloseTabsExit(),
                mPreferenceManager.getClearHistoryExitEnabled(),
                mPreferenceManager.getClearCookiesExitEnabled(),
                mPreferenceManager.getClearCacheExit()
        };
        final DialogInterface.OnMultiChoiceClickListener dialogListener
                = new DialogInterface.OnMultiChoiceClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which, boolean isChecked) {
                valueSet.put(which, isChecked);
            }
        };
        final AlertDialog.Builder builder = new AlertDialog.Builder(mActivity);
        builder.setMultiChoiceItems(entries, values, dialogListener)
                .setPositiveButton(R.string.action_set, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        mPreferenceManager.setCloseTabsExit(valueSet.get(0));
                        mPreferenceManager.setClearHistoryExitEnabled(valueSet.get(1));
                        mPreferenceManager.setClearCookiesExitEnabled(valueSet.get(2));
                        mPreferenceManager.setClearCacheExit(valueSet.get(3));
                        if (valueSet.get(0) || valueSet.get(1) || valueSet.get(2) || valueSet.get(3)) {
                            cbclearexit.setChecked(true);
                        } else {
                            cbclearexit.setChecked(false);
                        }
                    }
                })
                .setNegativeButton(R.string.action_cancel, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        dialog.dismiss();
                    }
                })
                .show();
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
            case SETTINGS_ATTRACK:
                mPreferenceManager.setAttrackEnabled((Boolean) newValue);
                cbattrack.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_LOCATION:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.LOCATION_ACCESS, TelemetryKeys.PRIVACY,
                        (!(boolean) newValue));
                mPreferenceManager.setLocationEnabled((Boolean) newValue);
                cblocation.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_ENABLECOOKIES:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE_COOKIES, TelemetryKeys.PRIVACY,
                        (!(boolean) newValue));
                mPreferenceManager.setCookiesEnabled((Boolean) newValue);
                cbenablecookies.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_SAVEPASSWORD:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.SAVE_PASSWORDS, TelemetryKeys.PRIVACY,
                        (!(boolean) newValue));
                mPreferenceManager.setSavePasswordsEnabled((Boolean) newValue);
                cbsavepasswords.setChecked((Boolean) newValue);
                if (!((Boolean) newValue)) {
                    clearPasswordsDialog();
                }
                return true;
            case SETTINGS_CLEAR_DATA_ON_EXIT:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.CLEAR_CACHE, TelemetryKeys.PRIVACY,
                        (!(boolean) newValue));
                clearDataDialog();
                return false;
            case SETTINGS_AUTO_FORGET:
                mTelemetry.sendSettingsMenuSignal(TelemetryKeys.AUTO_FORGET_TAB, TelemetryKeys.PRIVACY,
                        (!(boolean) newValue));
                mPreferenceManager.setAutoForgetModeEnabled((Boolean) newValue);
                return true;
            default:
                return false;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.PRIVACY, System.currentTimeMillis() - startTime);
    }
}
