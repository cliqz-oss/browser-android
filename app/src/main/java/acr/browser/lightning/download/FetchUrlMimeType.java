/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.download;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * This class is used to pull down the http headers of a given URL so that we
 * can analyse the mimetype and make any correction needed before we give the
 * URL to the download manager. This operation is needed when the user
 * long-clicks on a link or image and we don't know the mimetype. If the user
 * just clicks on the link, we will do the same steps of correcting the mimetype
 * down in android.os.webkit.LoadListener rather than handling it here.
 */
class FetchUrlMimeType extends Thread {

    private final String mUri;

    private final String mCookies;

    private final String mUserAgent;

    private final boolean mIsYouTubeVideo;

    private final Activity mActivity;

    public FetchUrlMimeType(Activity activity, String uri,
                            String cookies, String userAgent, boolean isYouTubeVideo) {
        mActivity = activity;
        mUri = uri;
        mCookies = cookies;
        mUserAgent = userAgent;
        mIsYouTubeVideo = isYouTubeVideo;
    }

    @Override
    public void run() {
        // User agent is likely to be null, though the AndroidHttpClient
        // seems ok with that.
        String mimeType = null;
        String contentDisposition = null;
        HttpURLConnection connection = null;
        try {
            URL url = new URL(mUri);
            connection = (HttpURLConnection) url.openConnection();
            if (mCookies != null && !mCookies.isEmpty()) {
                connection.addRequestProperty("Cookie", mCookies);
                connection.setRequestProperty("User-Agent", mUserAgent);
            }
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
                String contentDispositionHeader = connection.getHeaderField("Content-Disposition");
                if (contentDispositionHeader != null) {
                    contentDisposition = contentDispositionHeader;
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
        Handler handler = new Handler(Looper.getMainLooper());
        final String disposition = contentDisposition;
        final String type = mimeType;
        handler.post(new Runnable() {
            @Override
            public void run() {
                DownloadHandler.onDownloadStart(mActivity, mUri, mUserAgent, disposition, type, mIsYouTubeVideo);
            }
        });
    }
}
