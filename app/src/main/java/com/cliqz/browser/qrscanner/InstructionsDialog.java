package com.cliqz.browser.qrscanner;

import android.support.v7.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.DialogInterface.OnCancelListener;
import android.content.DialogInterface.OnClickListener;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.Telemetry;

/**
 * @author Stefano Pacifici
 */
class InstructionsDialog implements OnClickListener, OnCancelListener {

    private AlertDialog dialog = null;
    private Telemetry telemetry = null;
    private long startTime = 0;

    InstructionsDialog(Telemetry telemetry) {
        this.telemetry = telemetry;
        startTime = System.currentTimeMillis();
    }

    public void show(Context context) {
        if (dialog != null) {
            return;
        }

        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        dialog = builder
                .setView(R.layout.pairing_instructions_dialog)
                .setPositiveButton(R.string.got_it, this)
                .setCancelable(true)
                .setOnCancelListener(this)
                .show();
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case Dialog.BUTTON_POSITIVE:
                dismiss();
                telemetry.sendConnectScanSignal(System.currentTimeMillis() - startTime);
                break;
        }
    }

    public void dismiss() {
        if(dialog != null) {
            dialog.dismiss();
            dialog = null;
        }
    }

    public boolean isShown() {
        return dialog != null;
    }

    @Override
    public void onCancel(DialogInterface dialog) {
        dialog = null;
    }
}
