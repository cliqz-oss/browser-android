package com.cliqz.browser.utils;

import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.NotificationManagerCompat;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;

/**
 * @author Stefano Pacifici
 */
public class EnableNotificationDialog implements DialogInterface.OnClickListener {

    private final Context context;

    private EnableNotificationDialog(Context context) {
        this.context = context;
    }


    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                final Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.fromParts("package", context.getPackageName(), null));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                break;
            default:
                break;
        }
        dialog.dismiss();
    }

    /**
     * @return the dialog if one was shown, null otherwise (we can already display the notifications)
     */
    @Nullable
    public static Dialog showIfNeeded(@NonNull Context context, @NonNull Telemetry telemetry) {
        if (NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return null;
        }
        telemetry.sendNodificationDisabledSignal(TelemetryKeys.SUBSCRIPTION);
        final EnableNotificationDialog listener = new EnableNotificationDialog(context);
        return new AlertDialog.Builder(context)
                .setPositiveButton(R.string.settings, listener)
                .setNegativeButton(R.string.action_cancel, listener)
                .setTitle(R.string.dialog_notification_disabled_title)
                .setMessage(R.string.dialog_notification_disabled_msg)
                .setCancelable(true)
                .show();
    }
}
