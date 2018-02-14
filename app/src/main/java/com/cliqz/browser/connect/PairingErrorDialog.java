package com.cliqz.browser.connect;

import android.app.AlertDialog;
import android.content.DialogInterface;

import com.cliqz.browser.R;

/**
 * A simple dialog to show error messages from the pairing procedure
 *
 * @author Stefano Pacifici
 */
class PairingErrorDialog implements DialogInterface.OnCancelListener,
    DialogInterface.OnClickListener {

    private static PairingErrorDialog sDialog;

    private final PairedDevicesFragment pairedDevicesFragment;
    private AlertDialog dialog;

    private PairingErrorDialog(PairedDevicesFragment pairedDevicesFragment) {
        this.pairedDevicesFragment = pairedDevicesFragment;
    }

    static void show(PairedDevicesFragment pairedDevicesFragment) {
        if (sDialog != null && sDialog.isShowing()) {
            return;
        }
        sDialog = new PairingErrorDialog(pairedDevicesFragment);
        sDialog.show();
    }

    private void show() {
        final AlertDialog.Builder builder =
                new AlertDialog.Builder(pairedDevicesFragment.getContext());
        builder.setCancelable(true)
                .setOnCancelListener(this)
                .setMessage(R.string.pairing_error_message)
                .setTitle(R.string.pairing_error_title)
                .setPositiveButton(R.string.action_retry, this)
                .setNegativeButton(R.string.action_cancel, this);
        this.dialog = builder.show();
    }

    private boolean isShowing() {
        return (dialog != null && dialog.isShowing());
    }

    @Override
    public void onCancel(DialogInterface dialog) {
        dialog.dismiss();
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case AlertDialog.BUTTON_POSITIVE:
                pairedDevicesFragment.retry();
                break;
            default:
                dialog.dismiss();
                break;
        }
    }
}
