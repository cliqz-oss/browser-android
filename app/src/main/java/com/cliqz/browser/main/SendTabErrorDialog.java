package com.cliqz.browser.main;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import androidx.annotation.StringRes;

import com.cliqz.browser.R;
import com.cliqz.browser.connect.SyncActivity;
import com.cliqz.browser.telemetry.TelemetryKeys;

/**
 * @author Stefano Pacifici
 */
class SendTabErrorDialog implements DialogInterface.OnClickListener, DialogInterface.OnCancelListener {

    private final MainActivity mainActivity;
    private final SendTabErrorTypes type;
    private final long start;

    private SendTabErrorDialog(MainActivity activity, SendTabErrorTypes type) {
        this.mainActivity = activity;
        this.type = type;
        this.start = System.currentTimeMillis();
    }

    public static void show(MainActivity activity, SendTabErrorTypes errorType) {
        final SendTabErrorDialog dialogHolder = new SendTabErrorDialog(activity, errorType);
        final AlertDialog.Builder builder = new AlertDialog.Builder(activity);
        @StringRes final int title;
        @StringRes final int message;
        @StringRes final int positive;
        @StringRes final int cancel = R.string.action_cancel;
        if (errorType == SendTabErrorTypes.NO_CONNECTION_ERROR) {
            title = R.string.send_tab_no_connection_error_title;
            message = R.string.send_tab_no_connection_error_msg;
            positive = R.string.action_connect;
        } else {
            title = R.string.send_tab_generic_error_title;
            message = R.string.send_tab_generic_error_msg;
            positive = R.string.action_go_to_connect;
        }
        builder.setTitle(title)
            .setMessage(message)
            .setCancelable(true)
            .setPositiveButton(positive, dialogHolder)
            .setNegativeButton(cancel, dialogHolder)
            .setOnCancelListener(dialogHolder)
            .show();
        activity.telemetry.sendSendTabErrorSignal(errorType);
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                final Intent startConnectIntent =
                        new Intent(mainActivity, SyncActivity.class);
                mainActivity.telemetry.sendSendTabErrorClickSignal(type, TelemetryKeys.CONNECT);
                mainActivity.startActivity(startConnectIntent);
                break;
            case DialogInterface.BUTTON_NEGATIVE:
                mainActivity.telemetry.sendSendTabErrorClickSignal(type, TelemetryKeys.CANCEL);
                break;
            default:
                break;
        }
        dialog.dismiss();
    }

    @Override
    public void onCancel(DialogInterface dialog) {
        final long duration = System.currentTimeMillis() - start;
        mainActivity.telemetry.sendSendTabErrorCancelSignal(type, duration);
    }
}
