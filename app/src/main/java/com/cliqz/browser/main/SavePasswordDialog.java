package com.cliqz.browser.main;

import android.app.Activity;
import com.google.android.material.bottomsheet.BottomSheetDialog;
import android.view.LayoutInflater;
import android.view.View;

import com.cliqz.browser.R;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;

import acr.browser.lightning.database.LoginDetailItem;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Ravjit Uppal
 */
public class SavePasswordDialog {

    public interface PasswordDialogListener {

        void save(LoginDetailItem loginDetailItem);

        void neverSave(LoginDetailItem loginDetailItem);

    }

    private Activity mActivity;
    private PasswordDialogListener mPasswordDialogListener;
    private LoginDetailItem mLoginDetailItem;
    private BottomSheetDialog mDialog;
    private Telemetry mTelemetry;

    private SavePasswordDialog(Activity activity, PasswordDialogListener passwordDialogListener,
                               LoginDetailItem loginDetailItem, Telemetry telemetry) {
        this.mActivity = activity;
        this.mPasswordDialogListener = passwordDialogListener;
        this.mLoginDetailItem = loginDetailItem;
        this.mTelemetry = telemetry;
    }

    public static void show(Activity activity, PasswordDialogListener passwordDialogListener,
                            LoginDetailItem loginDetailItem, Telemetry telemetry) {
        final SavePasswordDialog savePasswordDialog = new SavePasswordDialog(activity,
                passwordDialogListener, loginDetailItem, telemetry);
        savePasswordDialog.mActivity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                savePasswordDialog.createDialog();
            }
        });
        savePasswordDialog.mTelemetry.sendPasswordDialogShowSignal();
    }

    private void createDialog() {
        final LayoutInflater layoutInflater = mActivity.getLayoutInflater();
        final View view = layoutInflater.inflate(R.layout.save_password_dialog, null);
        ButterKnife.bind(this, view);
        mDialog = new BottomSheetDialog(mActivity);
        mDialog.setContentView(view);
        mDialog.show();
    }

    @OnClick(R.id.password_dialog_close_button)
    void closeClicked() {
        mTelemetry.sendPasswordDialogClickSignal(TelemetryKeys.CLOSE);
        mDialog.dismiss();
    }

    @OnClick(R.id.password_dialog_save_button)
    void saveClicked() {
        mTelemetry.sendPasswordDialogClickSignal(TelemetryKeys.SAVE);
        mPasswordDialogListener.save(mLoginDetailItem);
        mDialog.dismiss();
    }

    @OnClick(R.id.password_dialog_never_button)
    void neverClicked() {
        mTelemetry.sendPasswordDialogClickSignal(TelemetryKeys.NEVER);
        mPasswordDialogListener.neverSave(mLoginDetailItem);
        mDialog.dismiss();
    }
}
