package com.cliqz.browser.main;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.view.View;

import com.cliqz.browser.R;

import acr.browser.lightning.utils.Utils;

/**
 * Handle broadcasted download messages
 *
 * @author Stefano Pacifici
 */
class DownoloadCompletedBroadcastReceiver extends BroadcastReceiver {

    private MainActivity mainActivity;

    public DownoloadCompletedBroadcastReceiver(final MainActivity mainActivity) {
        this.mainActivity = mainActivity;
    }

    public void onReceive(Context ctxt, final Intent intent) {
        final long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
        final boolean isYouTubeVideo = mainActivity.removeDownloadId(downloadId);
        final DownloadManager downloadManager = (DownloadManager)
                mainActivity.getSystemService(Context.DOWNLOAD_SERVICE);
        final DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        final Cursor cursor = downloadManager.query(query);
        final int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
        final int localUriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
        final int mediaTypeIndex = cursor.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE);
        if (cursor.moveToFirst()) {
            if (cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL) {
                if (isYouTubeVideo) {
                    mainActivity.telemetry.sendVideoDownloadedSignal(true);
                }
                final String uri = cursor.getString(localUriIndex);
                final String mediaType = cursor.getString(mediaTypeIndex);
                final Intent openFileIntent = createFileIntent(uri, mediaType);
                if (canIntentBeHandled(openFileIntent)) {
                    Utils.showSnackbar(mainActivity,
                            mainActivity.getString(R.string.download_successful),
                            mainActivity.getString(R.string.action_open),
                            new View.OnClickListener() {
                                @Override
                                public void onClick(View v) {
                                    mainActivity.startActivity(openFileIntent);
                                }
                            });
                } else {
                    Utils.showSnackbar(mainActivity,
                            mainActivity.getString(R.string.download_successful));
                }
            } else if (cursor.getInt(statusIndex) == DownloadManager.STATUS_FAILED) {
                if (isYouTubeVideo) {
                    mainActivity.telemetry.sendVideoDownloadedSignal(false);
                }
                Utils.showSnackbar(mainActivity, mainActivity.getString(R.string.download_failed));
            }
        }
        cursor.close();
    }

    private Intent createFileIntent(String uri, String mediaType) {
        final Intent intent = new Intent();
        intent.setAction(Intent.ACTION_VIEW);
        intent.setDataAndType(Uri.parse(uri), mediaType);
        return intent;
    }

    private boolean canIntentBeHandled(Intent intent) {
        final PackageManager pm = mainActivity.getPackageManager();
        return intent.resolveActivity(pm) != null;
    }
}
