package com.cliqz.browser.utils;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.webkit.MimeTypeMap;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;


/**
 * Based on the file {@link acr.browser.lightning.download.FetchUrlMimeType}
 *
 * @author Ravjit Uppal
 */
class FetchUrlMimeType extends Thread {

    private final String mUri;
    private final Context mContext;
    private final DownloadHelper.DownloaderListener mListener;
    private final String mFileName;

    /**
     * It makes an url connection and checks the mimetype in the header
     */
    FetchUrlMimeType(Context context, String uri, String filename,
                     DownloadHelper.DownloaderListener listener) {
        mContext = context;
        mUri = uri;
        mListener = listener;
        mFileName = filename;
    }

    @Override
    public void run() {
        // User agent is likely to be null, though the AndroidHttpClient
        // seems ok with that.
        String mimeType = null;
        HttpURLConnection connection = null;
        try {
            URL url = new URL(mUri);
            connection = (HttpURLConnection) url.openConnection();
            connection.connect();
            // We could get a redirect here, but if we do lets let
            // the download manager take care of it, and thus trust that
            // the server sends the right mimetype
            if (connection.getResponseCode() == 200) {
                String header = connection.getHeaderField("Content-Type");
                if (header != null) {
                    mimeType = header;
                    final int semicolonIndex = mimeType.indexOf(';');
                    if (semicolonIndex != -1) {
                        mimeType = mimeType.substring(0, semicolonIndex);
                    }
                }
            }
        } catch (IllegalArgumentException | IOException ex) {
            if (connection != null)
                connection.disconnect();
        } finally {
            if (connection != null)
                connection.disconnect();
        }

        if (mimeType != null) {
            if (mimeType.equalsIgnoreCase("text/plain")
                    || mimeType.equalsIgnoreCase("application/octet-stream")) {
                mimeType = MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                        MimeTypeMap.getFileExtensionFromUrl(mUri));
            }
        }

        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }

        // Start the download
        Handler handler = new Handler(Looper.getMainLooper());final String type = mimeType;
        handler.post(new Runnable() {
            @Override
            public void run() {
                DownloadHelper.download(mContext, mUri, mFileName, type, mListener);
            }
        });
    }
}
