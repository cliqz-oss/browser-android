package com.cliqz.browser.main;

import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import androidx.core.content.ContextCompat;
import androidx.appcompat.app.AlertDialog;
import android.widget.Button;

import com.cliqz.browser.R;
import com.cliqz.nove.Bus;

/**
 * @author Ravjit Uppal
 */
class NoWiFiDialog implements Dialog.OnClickListener {

    private Bus bus;

    public static void show(Context context, Bus bus) {
        final NoWiFiDialog noWiFiDialog = new NoWiFiDialog();
        noWiFiDialog.bus = bus;
        AlertDialog dialog = new AlertDialog.Builder(context)
                .setTitle(R.string.no_wi_fi_title)
                .setMessage(R.string.no_wi_fi_message)
                .setPositiveButton(R.string.settings, noWiFiDialog)
                .setCancelable(true)
                .setNegativeButton(R.string.dismiss, noWiFiDialog)
                .show();
        final Button negativeButton = dialog.getButton(DialogInterface.BUTTON_NEGATIVE);
        negativeButton.setTextColor(ContextCompat.getColor(context, R.color.gray_medium));
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case Dialog.BUTTON_POSITIVE:
                bus.post(new Messages.GoToSettings());
                break;
        }
    }
}
