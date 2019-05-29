package com.cliqz.browser.connect;

import android.content.DialogInterface;
import androidx.appcompat.app.AlertDialog;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;

import com.cliqz.browser.R;

import java.lang.ref.WeakReference;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnTextChanged;


/**
 * RenameDeviceDialog contains all the logic to enable the user to type a new name for the given
 * device
 *
 * @author Stefano Pacifici
 */
class RenameDeviceDialog implements DialogInterface.OnClickListener{
    // WeakReference because we are storing a refernce to a fragment
    private static WeakReference<RenameDeviceDialog> sDialog;
    private final PairedDevicesFragment pairedDevicesFragment;
    private final String id;
    private AlertDialog dialog;

    @BindView(R.id.pairedDeviceNewName)
    EditText pairedDeviceNewName;

    private RenameDeviceDialog(PairedDevicesFragment pairedDevicesFragment, String id) {
        this.pairedDevicesFragment = pairedDevicesFragment;
        this.id = id;
    }

    static void show(PairedDevicesFragment pairedDevicesFragment, String id) {
        final RenameDeviceDialog dialog = sDialog != null ? sDialog.get(): null;
        if (dialog != null && dialog.isShowing()) {
            // Avoid to display a second copy of the RenameDeviceDialog
            return;
        }
        final RenameDeviceDialog newDialog = new RenameDeviceDialog(pairedDevicesFragment, id);
        sDialog = new WeakReference<>(newDialog);
        newDialog.show();
    }

    private void show() {
        final AlertDialog.Builder builder =
                new AlertDialog.Builder(pairedDevicesFragment.getContext());
        builder.setView(R.layout.dialog_rename_paired_device)
                .setTitle(R.string.pairing_device_rename_title)
                .setCancelable(true)
                .setPositiveButton(R.string.action_ok, this)
                .setNegativeButton(R.string.action_cancel, this);
        dialog = builder.create();
        dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE);
        dialog.show();
        ButterKnife.bind(this, dialog);
        setOkButtonEnabled(false);
    }

    private void setOkButtonEnabled(boolean enabled) {
        final Button positive = dialog.getButton(DialogInterface.BUTTON_POSITIVE);
        positive.setEnabled(enabled);
    }

    private boolean isShowing() {
        return (dialog != null && dialog.isShowing());
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                runChecksAndRename();
                break;
            default:
                dialog.dismiss();
                break;
        }
    }

    private void runChecksAndRename() {
        final String newDeviceName = pairedDeviceNewName.getText().toString();
        if (newDeviceName.length() > 0) {
            pairedDevicesFragment.mService.renamePeer(id, newDeviceName);
            dialog.dismiss();
        }
    }

    @OnTextChanged(R.id.pairedDeviceNewName)
    void enableDisableOkButton(CharSequence text) {
        setOkButtonEnabled(text.length() > 0);
    }
}
