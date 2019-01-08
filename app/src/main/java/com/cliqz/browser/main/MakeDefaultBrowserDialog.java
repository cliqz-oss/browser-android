package com.cliqz.browser.main;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.provider.Settings;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.TelemetryKeys;

/**
 * @author Ravjit Uppal
 */
class MakeDefaultBrowserDialog implements DialogInterface.OnClickListener, DialogInterface.OnCancelListener {

    private final MainActivity mainActivity;
    private final long start;

    private MakeDefaultBrowserDialog(MainActivity mainActivity) {
        this.mainActivity = mainActivity;
        this.start = System.currentTimeMillis();
    }

    static void show(MainActivity mainActivity) {
        final MakeDefaultBrowserDialog dialog = new MakeDefaultBrowserDialog(mainActivity);
        final AlertDialog.Builder builder = new AlertDialog.Builder(mainActivity);
        final String title = mainActivity.getString(R.string.default_browser_title);
        final String message = mainActivity.getString(R.string.default_browser_message);
        builder.setTitle(title)
                .setMessage(message)
                .setPositiveButton(R.string.proceed, dialog)
                .setNegativeButton(R.string.action_cancel, dialog)
                .show();

    }

    @Override
    public void onClick(DialogInterface dialogInterface, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                final Intent intent = new Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
                mainActivity.startActivity(intent);
                mainActivity.telemetry.sendDefaultBrowserSignal(TelemetryKeys.CONFIRM);
                break;
            case DialogInterface.BUTTON_NEGATIVE:
                mainActivity.telemetry.sendDefaultBrowserSignal(TelemetryKeys.CANCEL);
                break;
        }
        final long duration = System.currentTimeMillis() - start;
        mainActivity.telemetry.sendDefaultBrowserCancelSignal(duration);
        dialogInterface.dismiss();
    }

    @Override
    public void onCancel(DialogInterface dialogInterface) {
        final long duration = System.currentTimeMillis() - start;
        mainActivity.telemetry.sendDefaultBrowserCancelSignal(duration);
    }
}
