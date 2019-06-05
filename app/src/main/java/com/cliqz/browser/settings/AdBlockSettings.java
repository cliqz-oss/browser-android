package com.cliqz.browser.settings;

import android.content.DialogInterface;
import android.os.Bundle;
import android.preference.CheckBoxPreference;
import android.preference.Preference;
import androidx.appcompat.app.AlertDialog;
import android.text.SpannableString;
import android.text.method.LinkMovementMethod;
import android.text.util.Linkify;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.TelemetryKeys;

/**
 * @author Stefano Pacifici
 * @date 2016/06/29
 */
public class AdBlockSettings extends BaseSettingsFragment {
    private static String SETTINGS_BLOCK_ADS = "cb_block_ads";
    private static String SETTINGS_OPTIMIZED_BLOCK_ADS = "cb_optimized_block_ads";
    private static String SETTINGS_WHAT_DOES_OPTIMIZED_MEAN = "what_does_optimized_mean";

    private CheckBoxPreference mBlockAdsCheckbox;
    private CheckBoxPreference mOptimizedBlockAdsCheckbox;
    private Preference mWhatDoesOptimizedMean;
    private long startTime;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startTime = System.currentTimeMillis();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_ADS, TelemetryKeys.MAIN);
        addPreferencesFromResource(R.xml.preferences_block_ads);

        mBlockAdsCheckbox = (CheckBoxPreference) findPreference(SETTINGS_BLOCK_ADS);
        mOptimizedBlockAdsCheckbox = (CheckBoxPreference) findPreference(SETTINGS_OPTIMIZED_BLOCK_ADS);
        mWhatDoesOptimizedMean = findPreference(SETTINGS_WHAT_DOES_OPTIMIZED_MEAN);

        updateUI();

        mBlockAdsCheckbox.setOnPreferenceChangeListener(this);
        mOptimizedBlockAdsCheckbox.setOnPreferenceChangeListener(this);
        mWhatDoesOptimizedMean.setOnPreferenceClickListener(this);
    }

    private void updateUI() {
        final boolean adBlockEnabled = mPreferenceManager.getAdBlockEnabled();
        mBlockAdsCheckbox.setChecked(adBlockEnabled);
        mOptimizedBlockAdsCheckbox.setChecked(mPreferenceManager.getOptimizedAdBlockEnabled());
        mOptimizedBlockAdsCheckbox.setEnabled(adBlockEnabled);
    }

    @Override
    public boolean onPreferenceChange(Preference preference, Object newValue) {
        if (preference == mBlockAdsCheckbox) {
            mTelemetry.sendSettingsMenuSignal(TelemetryKeys.ENABLE, TelemetryKeys.BLOCK_ADS,
                    !((Boolean) newValue));
            final boolean enabled = (Boolean) newValue;
            mPreferenceManager.setAdBlockEnabled(enabled);
        } else if (preference == mOptimizedBlockAdsCheckbox) {
            mTelemetry.sendSettingsMenuSignal(TelemetryKeys.FAIR_BLOCKING, TelemetryKeys.BLOCK_ADS,
                    !((Boolean) newValue));
            final boolean enabled = (Boolean) newValue;
            mPreferenceManager.setOptimizedAdBlockEnabled(enabled);
        }
        updateUI();
        return false;
    }

    @Override
    public boolean onPreferenceClick(Preference preference) {
        if (preference == mWhatDoesOptimizedMean) {
            mTelemetry.sendSettingsMenuSignal(TelemetryKeys.INFO, TelemetryKeys.BLOCK_ADS);
            final SpannableString dialogMessage = new SpannableString(getString(R.string.optimized_block_ads_description));
            Linkify.addLinks(dialogMessage, Linkify.ALL);
            final AlertDialog.Builder builder = new AlertDialog.Builder(getActivity());
            builder
                    .setTitle(R.string.what_does_optimized_mean)
                    .setMessage(dialogMessage)
                    .setCancelable(true)
                    .setPositiveButton(R.string.action_ok, new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                        }
                    });
            final AlertDialog dialog = builder.create();
            dialog.show();
            //To make the link clickable
            ((TextView)dialog.findViewById(android.R.id.message)).setMovementMethod(LinkMovementMethod.getInstance());
        }
        return false;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        mTelemetry.sendSettingsMenuSignal(TelemetryKeys.BLOCK_ADS, System.currentTimeMillis() - startTime);
    }
}
