/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.app.Activity;
import android.content.DialogInterface;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import android.support.v7.app.AlertDialog;
import android.text.InputFilter;
import android.util.Log;
import android.util.TypedValue;
import android.view.View;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.cliqz.browser.R;

import java.util.Arrays;
import java.util.List;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.Utils;

public class AdvancedSettingsFragment extends BaseSettingsFragment {

    // private static final String SETTINGS_NEWWINDOW = "allow_new_window";
    // private static final String SETTINGS_RESTORETABS = "restore_tabs";
    // private static final String SETTINGS_URLCONTENT = "url_contents";
    private static final String SETTINGS_TEXTENCODING = "text_encoding";
    private static final String SETTINGS_USERAGENT = "agent";
    private static final String SETTINGS_DOWNLOAD = "download";
    private static final String SETTINGS_PROXY = "proxy";
    private static final String SETTINGS_JAVASCRIPT = "cb_javascript";

    private Activity mActivity;
    private static final int API = Build.VERSION.SDK_INT;
    private CharSequence[] mProxyChoices;
    private int mAgentChoice;
    private String mDownloadLocation;
    private CheckBoxPreference cbJsScript; //cbAllowPopups, cbrestoreTabs
    private Preference textEncoding, useragent, downloadloc, proxy; //urlcontent,
    private CharSequence[] mUrlOptions;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_advanced);

        mActivity = getActivity();

        initPrefs();
    }

    private void initPrefs() {
        // mPreferenceManager storage
        textEncoding = findPreference(SETTINGS_TEXTENCODING);
        // urlcontent = findPreference(SETTINGS_URLCONTENT);
        // cbAllowPopups = (CheckBoxPreference) findPreference(SETTINGS_NEWWINDOW);
        // cbrestoreTabs = (CheckBoxPreference) findPreference(SETTINGS_RESTORETABS);
        cbJsScript = (CheckBoxPreference) findPreference(SETTINGS_JAVASCRIPT);
        proxy = findPreference(SETTINGS_PROXY);
        useragent = findPreference(SETTINGS_USERAGENT);
        downloadloc = findPreference(SETTINGS_DOWNLOAD);

        textEncoding.setOnPreferenceClickListener(this);
        // urlcontent.setOnPreferenceClickListener(this);
        proxy.setOnPreferenceClickListener(this);
        useragent.setOnPreferenceClickListener(this);
        downloadloc.setOnPreferenceClickListener(this);
        // cbAllowPopups.setOnPreferenceChangeListener(this);
        // cbrestoreTabs.setOnPreferenceChangeListener(this);
        cbJsScript.setOnPreferenceChangeListener(this);

        textEncoding.setSummary(mPreferenceManager.getTextEncoding());

        mUrlOptions = getResources().getStringArray(R.array.url_content_array);
        int option = mPreferenceManager.getUrlBoxContentChoice();
        // urlcontent.setSummary(mUrlOptions[option]);

        // cbAllowPopups.setChecked(mPreferenceManager.getPopupsEnabled());
        // cbrestoreTabs.setChecked(mPreferenceManager.getRestoreLostTabsEnabled());
        cbJsScript.setChecked(mPreferenceManager.getJavaScriptEnabled());

        mProxyChoices = getResources().getStringArray(R.array.proxy_choices_array);
        int choice = mPreferenceManager.getProxyChoice();
        if (choice == Constants.PROXY_MANUAL) {
            proxy.setSummary(mPreferenceManager.getProxyHost() + ":" + mPreferenceManager.getProxyPort());
        } else {
            proxy.setSummary(mProxyChoices[choice]);
        }
        proxy.setEnabled(Constants.FULL_VERSION);

        mAgentChoice = mPreferenceManager.getUserAgentChoice();
        switch (mAgentChoice) {
            case 1:
                useragent.setSummary(getResources().getString(R.string.agent_default));
                break;
            case 2:
                useragent.setSummary(getResources().getString(R.string.agent_desktop));
                break;
            case 3:
                useragent.setSummary(getResources().getString(R.string.agent_mobile));
                break;
            case 4:
                useragent.setSummary(getResources().getString(R.string.agent_custom));
        }

        mDownloadLocation = mPreferenceManager.getDownloadDirectory();
        downloadloc.setSummary(Constants.EXTERNAL_STORAGE + '/' + mDownloadLocation);
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        switch (preference.getKey()) {
            case SETTINGS_PROXY:
                proxyChoicePicker();
                return true;
            case SETTINGS_USERAGENT:
                agentDialog();
                return true;
            case SETTINGS_DOWNLOAD:
                downloadLocDialog();
                return true;
//            case SETTINGS_URLCONTENT:
//                urlBoxPicker();
//                return true;
            case SETTINGS_TEXTENCODING:
                textEncodingPicker();
                return true;
            default:
                return false;
        }
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
//            case SETTINGS_NEWWINDOW:
//                mPreferenceManager.setPopupsEnabled((Boolean) newValue);
//                cbAllowPopups.setChecked((Boolean) newValue);
//                return true;
//            case SETTINGS_RESTORETABS:
//                mPreferenceManager.setRestoreLostTabsEnabled((Boolean) newValue);
//                cbrestoreTabs.setChecked((Boolean) newValue);
//                return true;
            case SETTINGS_JAVASCRIPT:
                mPreferenceManager.setJavaScriptEnabled((Boolean) newValue);
                cbJsScript.setChecked((Boolean) newValue);
                return true;
            default:
                return false;
        }
    }

    private void proxyChoicePicker() {
        AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(getResources().getString(R.string.http_proxy));
        picker.setSingleChoiceItems(mProxyChoices, mPreferenceManager.getProxyChoice(),
                new DialogInterface.OnClickListener() {

                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        setProxyChoice(which);
                    }
                });
        picker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                    }
                });
        picker.show();
    }

    private void setProxyChoice(int choice) {
        switch (choice) {
            case Constants.PROXY_ORBOT:
                choice = mProxyUtils.setProxyChoice(choice, mActivity);
                break;
            case Constants.PROXY_I2P:
                choice = mProxyUtils.setProxyChoice(choice, mActivity);
                break;
            case Constants.PROXY_MANUAL:
                manualProxyPicker();
                break;
        }

        mPreferenceManager.setProxyChoice(choice);
        if (choice < mProxyChoices.length)
            proxy.setSummary(mProxyChoices[choice]);
    }

    private void manualProxyPicker() {
        View v = mActivity.getLayoutInflater().inflate(R.layout.picker_manual_proxy, null);
        final EditText eProxyHost = (EditText) v.findViewById(R.id.proxyHost);
        final EditText eProxyPort = (EditText) v.findViewById(R.id.proxyPort);

        // Limit the number of characters since the port needs to be of type int
        // Use input filters to limite the EditText length and determine the max
        // length by using length of integer MAX_VALUE
        int maxCharacters = Integer.toString(Integer.MAX_VALUE).length();
        InputFilter[] filterArray = new InputFilter[1];
        filterArray[0] = new InputFilter.LengthFilter(maxCharacters - 1);
        eProxyPort.setFilters(filterArray);

        eProxyHost.setText(mPreferenceManager.getProxyHost());
        eProxyPort.setText(Integer.toString(mPreferenceManager.getProxyPort()));

        new AlertDialog.Builder(mActivity)
                .setTitle(R.string.manual_proxy)
                .setView(v)
                .setPositiveButton(R.string.action_ok, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialogInterface, int i) {
                        String proxyHost = eProxyHost.getText().toString();
                        int proxyPort;
                        try {
                            // Try/Catch in case the user types an empty string or a number
                            // larger than max integer
                            proxyPort = Integer.parseInt(eProxyPort.getText().toString());
                        } catch (NumberFormatException ignored) {
                            proxyPort = mPreferenceManager.getProxyPort();
                        }
                        mPreferenceManager.setProxyHost(proxyHost);
                        mPreferenceManager.setProxyPort(proxyPort);
                        proxy.setSummary(proxyHost + ":" + proxyPort);
                    }
                }).show();
    }

    private void agentDialog() {
        AlertDialog.Builder agentPicker = new AlertDialog.Builder(mActivity);
        agentPicker.setTitle(getResources().getString(R.string.title_user_agent));
        mAgentChoice = mPreferenceManager.getUserAgentChoice();
        agentPicker.setSingleChoiceItems(R.array.user_agent, mAgentChoice - 1,
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        mPreferenceManager.setUserAgentChoice(which + 1);
                        switch (which + 1) {
                            case 1:
                                useragent.setSummary(getResources().getString(R.string.agent_default));
                                break;
                            case 2:
                                useragent.setSummary(getResources().getString(R.string.agent_desktop));
                                break;
                            case 3:
                                useragent.setSummary(getResources().getString(R.string.agent_mobile));
                                break;
                            case 4:
                                useragent.setSummary(getResources().getString(R.string.agent_custom));
                                agentPicker();
                                break;
                        }
                    }
                });
        agentPicker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                    }
                });
        agentPicker.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override
            public void onCancel(DialogInterface dialog) {
                Log.i("Cancelled", "");
            }
        });
        agentPicker.show();
    }

    private void agentPicker() {
        final AlertDialog.Builder agentStringPicker = new AlertDialog.Builder(mActivity);
        agentStringPicker.setTitle(getResources().getString(R.string.title_user_agent));
        final EditText getAgent = new EditText(mActivity);
        agentStringPicker.setView(getAgent);
        agentStringPicker.setPositiveButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String text = getAgent.getText().toString();
                        mPreferenceManager.setUserAgentString(text);
                        useragent.setSummary(getResources().getString(R.string.agent_custom));
                    }
                });
        agentStringPicker.show();
    }

    private void downloadLocDialog() {
        AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(getResources().getString(R.string.title_download_location));
        mDownloadLocation = mPreferenceManager.getDownloadDirectory();
        int n;
        if (mDownloadLocation.contains(Environment.DIRECTORY_DOWNLOADS)) {
            n = 1;
        } else {
            n = 2;
        }

        picker.setSingleChoiceItems(R.array.download_folder, n - 1,
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        switch (which + 1) {
                            case 1:
                                mPreferenceManager.setDownloadDirectory(Environment.DIRECTORY_DOWNLOADS);
                                downloadloc.setSummary(Constants.EXTERNAL_STORAGE + '/'
                                        + Environment.DIRECTORY_DOWNLOADS);
                                break;
                            case 2:
                                downPicker();
                                break;
                        }
                    }
                });
        picker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                    }
                });
        picker.show();
    }

    private void downPicker() {
        final AlertDialog.Builder downLocationPicker = new AlertDialog.Builder(mActivity);
        LinearLayout layout = new LinearLayout(mActivity);
        downLocationPicker.setTitle(getResources().getString(R.string.title_download_location));
        final EditText getDownload = new EditText(mActivity);
        getDownload.setText(mPreferenceManager.getDownloadDirectory());

        int padding = Utils.dpToPx(10);

        TextView v = new TextView(mActivity);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        v.setTextColor(Color.DKGRAY);
        v.setText(Constants.EXTERNAL_STORAGE + '/');
        v.setPadding(padding, padding, 0, padding);
        layout.addView(v);
        layout.addView(getDownload);
        if (API < Build.VERSION_CODES.JELLY_BEAN) {
            layout.setBackgroundDrawable(getResources().getDrawable(android.R.drawable.edit_text));
        } else {
            Drawable drawable;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                drawable = getResources().getDrawable(android.R.drawable.edit_text, getActivity().getTheme());
            } else {
                drawable = getResources().getDrawable(android.R.drawable.edit_text);
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
                layout.setBackground(drawable);
            } else {
                layout.setBackgroundDrawable(drawable);
            }
        }
        downLocationPicker.setView(layout);
        downLocationPicker.setPositiveButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String text = getDownload.getText().toString();
                        mPreferenceManager.setDownloadDirectory(text);
                        downloadloc.setSummary(Constants.EXTERNAL_STORAGE + '/' + text);
                    }
                });
        downLocationPicker.show();
    }


    private void textEncodingPicker() {
        AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(getResources().getString(R.string.text_encoding));
        final List<String> textEncodingList = Arrays.asList(Constants.TEXT_ENCODINGS);
        int n = textEncodingList.indexOf(mPreferenceManager.getTextEncoding());

        picker.setSingleChoiceItems(Constants.TEXT_ENCODINGS, n, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                mPreferenceManager.setTextEncoding(Constants.TEXT_ENCODINGS[which]);
                textEncoding.setSummary(Constants.TEXT_ENCODINGS[which]);
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });
        picker.show();
    }

    private void urlBoxPicker() {
        AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(getResources().getString(R.string.url_contents));

        int n = mPreferenceManager.getUrlBoxContentChoice();

//        picker.setSingleChoiceItems(mUrlOptions, n, new DialogInterface.OnClickListener() {
//            @Override
//            public void onClick(DialogInterface dialog, int which) {
//                mPreferenceManager.setUrlBoxContentChoice(which);
//                if (which < mUrlOptions.length) {
//                    urlcontent.setSummary(mUrlOptions[which]);
//                }
//            }
//        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {

                    }
                });
        picker.show();
    }
}
