package com.cliqz.browser.utils;

import android.app.DownloadManager;
import android.app.DownloadManager.Request;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.os.EnvironmentCompat;

import android.webkit.URLUtil;

import com.cliqz.utils.StringUtils;

import java.net.URLConnection;

/**
 * @author Stefano Pacifici
 */

public class DownloadHelper {

    private static final String TAG = DownloadHelper.class.getSimpleName();

    public enum Error {
        MEDIA_NOT_MOUNTED,
        MEDIA_NOT_AVAILABLE,
        INVALID_URL,
        WRITE_PERMISSION_DENIED,
        UNKNOWN_ERROR
    }
    public interface DownloaderListener {
        void onSuccess(String url);
        void onFailure(String url, Error error, Throwable throwable);
    }

    private DownloadHelper() {} // No instances

    /**
     * Starts the Android standard downloader
     * @param context
     * @param url
     */
    public static void download(@NonNull  Context context, @NonNull  String url,
                                @Nullable String filename, @Nullable String mimetype,
                                @NonNull DownloaderListener listener) {
        if (filename == null || filename.length() == 0) {
            filename = URLUtil.guessFileName(url, null, mimetype);
        }
        if (mimetype == null) {
            try {
                mimetype = URLConnection.guessContentTypeFromName(filename);
            } catch (Exception e) {
                new FetchUrlMimeType(context, url, filename, listener).start();
                return;
            }
        }

        // Check if path is available
        final String pathStatus =
                EnvironmentCompat.getStorageState(
                        Environment.getExternalStoragePublicDirectory(
                                Environment.DIRECTORY_DOWNLOADS));
        final String cleanAddress = StringUtils.encodeURLProperly(url);
        if (!Environment.MEDIA_MOUNTED.equals(pathStatus)) {
            listener.onFailure(url,
                    Environment.MEDIA_SHARED.equals(pathStatus) ?
                            Error.MEDIA_NOT_MOUNTED :
                            Error.MEDIA_NOT_AVAILABLE,
                    null);
            return;
        }
        if  (cleanAddress == null) {
            listener.onFailure(url, Error.INVALID_URL, null);
            return;
        }
        try {
            final Request request = new Request(Uri.parse(cleanAddress));
            request.setMimeType(mimetype);
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
            request.setVisibleInDownloadsUi(true);
            request.allowScanningByMediaScanner();
            request.setDescription(filename);
            request.setNotificationVisibility(Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

            final DownloadManager manager =
                    (DownloadManager) context.getSystemService(Context.DOWNLOAD_SERVICE);
            manager.enqueue(request);
            listener.onSuccess(url);
        } catch (SecurityException e) {
            listener.onFailure(url, Error.WRITE_PERMISSION_DENIED, e);
        } catch (Exception e) {
            listener.onFailure(url, Error.UNKNOWN_ERROR, e);
        }
    }
}
