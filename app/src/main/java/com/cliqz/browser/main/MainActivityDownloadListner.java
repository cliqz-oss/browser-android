package com.cliqz.browser.main;

import android.Manifest;
import android.support.v7.app.AlertDialog;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.cliqz.browser.utils.DownloadHelper;

import acr.browser.lightning.bus.BrowserEvents.ShowSnackBarMessage;

/**
 * @author Stefano Pacifici
 */
class MainActivityDownloadListner extends PermissionsResultAction implements DownloadHelper.DownloaderListener {

    private final MainActivity activity;
    private final String url;
    private final String filename;

    public MainActivityDownloadListner(MainActivity activity, String url, String filename) {
        this.activity = activity;
        this.url = url;
        this.filename = filename;
    }

    @Override
    public void onSuccess(String url) {
        activity.bus.post(new ShowSnackBarMessage(activity
                .getString(R.string.download_started)));
    }

    @Override
    public void onFailure(String url, DownloadHelper.Error error, Throwable throwable) {
        switch (error) {
            case WRITE_PERMISSION_DENIED:
                PermissionsManager.getInstance()
                        .requestPermissionsIfNecessaryForResult(activity,
                                this, Manifest.permission.WRITE_EXTERNAL_STORAGE);
                break;
            default:
                final AlertDialog.Builder builder = new AlertDialog.Builder(activity);
                builder.setMessage(activity.getString(R.string.download_failed))
                        .setTitle(activity.getString(R.string.title_error))
                        .setPositiveButton(activity.getString(R.string.action_ok), null)
                        .show();
                break;
        }
    }

    @Override
    public void onGranted() {
        DownloadHelper.download(activity, url, filename, null, this);
    }

    @Override
    public void onDenied(String permission) {

    }
}
