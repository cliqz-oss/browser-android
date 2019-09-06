/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.download;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import androidx.appcompat.app.AlertDialog;

import android.webkit.DownloadListener;
import android.webkit.URLUtil;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents.ShowSnackBarMessage;
import timber.log.Timber;

public class LightningDownloadListener implements DownloadListener {

    @Inject
    Bus bus;

    @Inject
    Activity activity;

    public LightningDownloadListener(Context context) {
        BrowserApp.getActivityComponent(context).inject(this);
    }

    @Override
    public void onDownloadStart(final String url, final String userAgent,
                                final String contentDisposition, final String mimetype, long contentLength) {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity,
                new Result(url, userAgent, contentDisposition, mimetype),
                Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE);
    }

    private class Result extends PermissionsResultAction{

        final String url;
        final String userAgent;
        final String contentDisposition;
        final String mimetype;

        Result(String url, String userAgent, String contentDisposition, String mimetype) {
            this.url = url;
            this.userAgent = userAgent;
            this.contentDisposition = contentDisposition;
            this.mimetype = mimetype;
        }

        @Override
        public void onGranted() {
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimetype);
            DialogInterface.OnClickListener dialogClickListener = new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    switch (which) {
                        case DialogInterface.BUTTON_POSITIVE:
                            bus.post(new ShowSnackBarMessage(activity
                                    .getString(R.string.download_started)));
                            DownloadHandler.onDownloadStart(activity, url, userAgent,
                                    contentDisposition, mimetype, false);
                            break;

                        case DialogInterface.BUTTON_NEGATIVE:
                            break;
                    }
                }
            };

            AlertDialog.Builder builder = new AlertDialog.Builder(activity); // dialog
            builder.setTitle(fileName)
                    .setMessage(activity.getResources().getString(R.string.dialog_download))
                    .setPositiveButton(activity.getResources().getString(R.string.action_download),
                            dialogClickListener)
                    .setNegativeButton(activity.getResources().getString(R.string.action_cancel),
                            dialogClickListener).show();
            Timber.i("Downloading%s", fileName);
        }

        @Override
        public void onDenied(String permission) {

        }
    }

}
