/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.download;

import android.Manifest;
import android.app.Activity;
import android.content.DialogInterface;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.nove.Bus;
import com.google.zxing.Result;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.bus.BrowserEvents.ShowSnackBarMessage;
import acr.browser.lightning.constant.Constants;

public class LightningDownloadListener implements DownloadListener {

    @Inject
    Bus bus;

    private final Activity mActivity;

    public LightningDownloadListener(Activity context) {
        mActivity = context;
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    public void onDownloadStart(final String url, final String userAgent,
                                final String contentDisposition, final String mimetype, long contentLength) {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(mActivity,
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
                            bus.post(new ShowSnackBarMessage(mActivity
                                    .getString(R.string.download_started)));
                            DownloadHandler.onDownloadStart(mActivity, url, userAgent,
                                    contentDisposition, mimetype, false);
                            break;

                        case DialogInterface.BUTTON_NEGATIVE:
                            break;
                    }
                }
            };

            AlertDialog.Builder builder = new AlertDialog.Builder(mActivity); // dialog
            builder.setTitle(fileName)
                    .setMessage(mActivity.getResources().getString(R.string.dialog_download))
                    .setPositiveButton(mActivity.getResources().getString(R.string.action_download),
                            dialogClickListener)
                    .setNegativeButton(mActivity.getResources().getString(R.string.action_cancel),
                            dialogClickListener).show();
            Log.i(Constants.TAG, "Downloading" + fileName);
        }

        @Override
        public void onDenied(String permission) {

        }
    }

}
