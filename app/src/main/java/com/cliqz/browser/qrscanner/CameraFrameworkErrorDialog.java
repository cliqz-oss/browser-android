package com.cliqz.browser.qrscanner;

import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.support.v4.app.FragmentManager;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
class CameraFrameworkErrorDialog implements DialogInterface.OnClickListener, DialogInterface.OnCancelListener {

    private final CaptureFragment fragment;
    private static Dialog mDialog;

    private CameraFrameworkErrorDialog(CaptureFragment fragment) {
        this.fragment = fragment;
    }

    static void show(CaptureFragment fragment) {
        if (mDialog != null) {
            return;
        }
        final CameraFrameworkErrorDialog dialog = new CameraFrameworkErrorDialog(fragment);
        mDialog = dialog.internalShow();
    }

    private Dialog internalShow() {
        final Context context = fragment.getContext();
        final AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(context.getString(R.string.app_name));
        builder.setMessage(context.getString(R.string.msg_camera_framework_bug));
        builder.setPositiveButton(R.string.action_ok, this);
        builder.setOnCancelListener(this);
        return builder.show();
    }

    @Override
    public void onCancel(DialogInterface dialog) {
        pop();
    }

    @Override
    public void onClick(DialogInterface dialog, int which) {
        pop();
    }

    private void pop() {
        mDialog.dismiss();
        mDialog = null;

        FragmentManager fm = fragment.getFragmentManager();
        fm.popBackStack();
    }
}
