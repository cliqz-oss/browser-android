/*
 * Copyright 2014 A.C.R. Development
 */
package com.cliqz.browser.settings;

import android.app.Activity;
import android.content.DialogInterface;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import android.support.v7.app.AlertDialog;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import com.cliqz.browser.R;

public class DisplaySettingsFragment extends BaseSettingsFragment {

    private static final String SETTINGS_HIDESTATUSBAR = "fullScreenOption";
    private static final String SETTINGS_THEME = "app_theme";
    private static final String SETTINGS_TEXTSIZE = "text_size";
    private static final String SETTINGS_COLORMODE = "cb_colormode";
    private static final float XXLARGE = 30.0f;
    private static final float XLARGE = 26.0f;
    private static final float LARGE = 22.0f;
    private static final float MEDIUM = 18.0f;
    private static final float SMALL = 14.0f;
    private static final float XSMALL = 10.0f;

    private Activity mActivity;
    private CheckBoxPreference cbstatus, cbcolormode;
    private Preference theme, textSize;
    private String[] mThemeOptions;
    private int mCurrentTheme;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Load the preferences from an XML resource
        addPreferencesFromResource(R.xml.preference_display);

        mActivity = getActivity();

        initPrefs();
    }

    private void initPrefs() {
        // mPreferenceManager storage
        mThemeOptions = this.getResources().getStringArray(R.array.themes);
        mCurrentTheme = mPreferenceManager.getUseTheme();

        theme = findPreference(SETTINGS_THEME);
        textSize = findPreference(SETTINGS_TEXTSIZE);
        cbstatus = (CheckBoxPreference) findPreference(SETTINGS_HIDESTATUSBAR);
        cbcolormode = (CheckBoxPreference) findPreference(SETTINGS_COLORMODE);

        theme.setOnPreferenceClickListener(this);
        textSize.setOnPreferenceClickListener(this);
        cbstatus.setOnPreferenceChangeListener(this);
        cbcolormode.setOnPreferenceChangeListener(this);

        cbstatus.setChecked(mPreferenceManager.getHideStatusBarEnabled());
        cbcolormode.setChecked(mPreferenceManager.getColorModeEnabled());

        theme.setSummary(mThemeOptions[mPreferenceManager.getUseTheme()]);
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        switch (preference.getKey()) {
            case SETTINGS_THEME:
                themePicker();
                return true;
            case SETTINGS_TEXTSIZE:
                textSizePicker();
                return true;
            default:
                return false;
        }
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        // switch preferences
        switch (preference.getKey()) {
            case SETTINGS_HIDESTATUSBAR:
                mPreferenceManager.setHideStatusBarEnabled((Boolean) newValue);
                cbstatus.setChecked((Boolean) newValue);
                return true;
            case SETTINGS_COLORMODE:
                mPreferenceManager.setColorModeEnabled((Boolean) newValue);
                cbcolormode.setChecked((Boolean) newValue);
                return true;
            default:
                return false;
        }
    }

    private void textSizePicker() {
        AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
        LayoutInflater inflater = getActivity().getLayoutInflater();
        LinearLayout view = (LinearLayout) inflater.inflate(R.layout.seek_layout, null);
        final SeekBar bar = (SeekBar) view.findViewById(R.id.text_size_seekbar);
        final TextView sample = new TextView(getActivity());
        sample.setText(R.string.untitled);
        sample.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.WRAP_CONTENT));
        sample.setGravity(Gravity.CENTER_HORIZONTAL);
        view.addView(sample);
        bar.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {

            @Override
            public void onProgressChanged(SeekBar view, int size, boolean user) {
                sample.setTextSize(getTextSize(size));
            }

            @Override
            public void onStartTrackingTouch(SeekBar arg0) {
            }

            @Override
            public void onStopTrackingTouch(SeekBar arg0) {
            }

        });
        final int MAX = 5;
        bar.setMax(MAX);
        bar.setProgress(MAX - mPreferenceManager.getTextSize());
        builder.setView(view);
        builder.setTitle(R.string.title_text_size);
        builder.setPositiveButton(android.R.string.ok, new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface arg0, int arg1) {
                mPreferenceManager.setTextSize(MAX - bar.getProgress());
            }

        });
        builder.show();
    }

    private float getTextSize(int size) {
        switch (size) {
            case 0:
                return XSMALL;
            case 1:
                return SMALL;
            case 2:
                return MEDIUM;
            case 3:
                return LARGE;
            case 4:
                return XLARGE;
            case 5:
                return XXLARGE;
            default:
                return MEDIUM;
        }
    }

    private void themePicker() {
        AlertDialog.Builder picker = new AlertDialog.Builder(mActivity);
        picker.setTitle(getResources().getString(R.string.theme));

        int n = mPreferenceManager.getUseTheme();
        picker.setSingleChoiceItems(mThemeOptions, n, new DialogInterface.OnClickListener() {

            @Override
            public void onClick(DialogInterface dialog, int which) {
                mPreferenceManager.setUseTheme(which);
                if (which < mThemeOptions.length) {
                    theme.setSummary(mThemeOptions[which]);
                }
            }
        });
        picker.setNeutralButton(getResources().getString(R.string.action_ok),
                new DialogInterface.OnClickListener() {

                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        if (mCurrentTheme != mPreferenceManager.getUseTheme()) {
                            getActivity().onBackPressed();
                        }
                    }
                });
        picker.setOnCancelListener(new DialogInterface.OnCancelListener() {
            @Override
            public void onCancel(DialogInterface dialog) {
                if (mCurrentTheme != mPreferenceManager.getUseTheme()) {
                    getActivity().onBackPressed();
                }
            }
        });
        picker.show();
    }
}
