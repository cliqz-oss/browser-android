package com.cliqz.browser.connect;

import android.app.AlertDialog;
import android.content.DialogInterface;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
class FirstPairedDeviceDialog implements DialogInterface.OnClickListener{

    private static FirstPairedDeviceDialog sDialog;
    private final PairedDevicesFragment pairedDevicesFragment;
    private AlertDialog mDialog;

    private FirstPairedDeviceDialog(PairedDevicesFragment pairedDevicesFragment) {
        this.pairedDevicesFragment = pairedDevicesFragment;
    }

    public static void show(PairedDevicesFragment pairedDevicesFragment) {
        if (sDialog != null && sDialog.isShowing()) {
            return;
        }
        sDialog = new FirstPairedDeviceDialog(pairedDevicesFragment);
        sDialog.show();
    }

    private void show() {
        final AlertDialog.Builder builder =
                new AlertDialog.Builder(pairedDevicesFragment.getContext());
        builder.setTitle(R.string.pairing_successful_title)
                .setMessage(R.string.pairing_successful_message)
                .setPositiveButton(R.string.action_ok, this);
        mDialog = builder.show();
    }

    private boolean isShowing() {
        return (mDialog != null && mDialog.isShowing());
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        dialog.dismiss();
    }
}
