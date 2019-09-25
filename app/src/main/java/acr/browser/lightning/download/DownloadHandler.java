/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.download;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.URLUtil;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.nove.Bus;
import com.cliqz.utils.WebAddress;

import java.io.File;
import java.io.IOException;

import acr.browser.lightning.bus.BrowserEvents;
import timber.log.Timber;

/**
 * Handle download requests
 */
public class DownloadHandler {

    private static final String TAG = DownloadHandler.class.getSimpleName();
    private static final String COOKIE_REQUEST_HEADER = "Cookie";

    @Deprecated
    public static final String DEFAULT_DOWNLOAD_PATH =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    .getPath();


    /**
     * Notify the host application a download should be done, or that the data
     * should be streamed if a streaming viewer is available.
     *
     * @param activity            The context in which the download was requested.
     * @param url                The full url to the content that should be downloaded
     * @param userAgent          User agent of the downloading application.
     * @param contentDisposition Content-disposition http header, if present.
     * @param mimetype           The mimetype of the content reported by the server
     */
    public static void onDownloadStart(Activity activity, String url, String userAgent,
                                       String contentDisposition, String mimetype) {
        // if we're dealing wih A/V content that's not explicitly marked
        // for download, check if it's streamable.
        if (contentDisposition == null
                || !contentDisposition.regionMatches(true, 0, "attachment", 0, 10)) {
            // query the package manager to see if there's a registered handler
            // that matches.
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(Uri.parse(url), mimetype);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            intent.setComponent(null);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ICE_CREAM_SANDWICH_MR1) {
                intent.setSelector(null);
            }
            ResolveInfo info = activity.getPackageManager().resolveActivity(intent,
                    PackageManager.MATCH_DEFAULT_ONLY);
            if (info != null) {
                // If we resolved to ourselves, we don't want to attempt to
                // load the url only to try and download it again.
                if (BuildConfig.APPLICATION_ID.equals(info.activityInfo.packageName)
                        /*|| MainActivity.class.getName().equals(info.activityInfo.name)*/) {
                    // someone (other than us) knows how to handle this mime
                    // type with this scheme, don't download.
                    try {
                        activity.startActivity(intent);
                        return;
                    } catch (ActivityNotFoundException ex) {
                        // Best behavior is to fall back to a download in this
                        // case
                    }
                }
            }
        }
        onDownloadStartNoStream(activity, url, userAgent, contentDisposition, mimetype);
    }

    // This is to work around the fact that java.net.URI throws Exceptions
    // instead of just encoding URL's properly
    // Helper method for onDownloadStartNoStream
    private static String encodePath(String path) {
        char[] chars = path.toCharArray();

        boolean needed = false;
        for (char c : chars) {
            if (c == '[' || c == ']' || c == '|') {
                needed = true;
                break;
            }
        }
        if (!needed) {
            return path;
        }

        StringBuilder sb = new StringBuilder("");
        for (char c : chars) {
            if (c == '[' || c == ']' || c == '|') {
                sb.append('%');
                sb.append(Integer.toHexString(c));
            } else {
                sb.append(c);
            }
        }

        return sb.toString();
    }

    /**
     * Notify the host application a download should be done, even if there is a
     * streaming viewer available for thise type.
     *
     * @param activity           The context in which the download is requested.
     * @param url                The full url to the content that should be downloaded
     * @param userAgent          User agent of the downloading application.
     * @param contentDisposition Content-disposition http header, if present.
     * @param mimetype           The mimetype of the content reported by the server
     */
    /* package */
    private static void onDownloadStartNoStream(final Activity activity, String url, String userAgent,
                                                String contentDisposition, String mimetype) {

        if (mimetype == null || mimetype.isEmpty()) {
            new FetchUrlMimeType(activity, url, contentDisposition, mimetype).start();
            return;
        }

        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(activity);
        final Bus eventBus = component != null ? component.getBus() : new Bus();
        final String filename = URLUtil.guessFileName(url, contentDisposition, mimetype);

        // java.net.URI is a lot stricter than KURL so we have to encode some
        // extra characters. Fix for b 2538060 and b 1634719
        WebAddress webAddress;
        try {
            webAddress = new WebAddress(url);
            webAddress.setPath(encodePath(webAddress.getPath()));
        } catch (Exception e) {
            // This only happens for very bad urls, we want to catch the
            // exception here
            Timber.e(e, "Exception while trying to parse url '" + url + '\'');
            eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.problem_download));
            return;
        }

        String addressString = webAddress.toString();
        Uri uri = Uri.parse(addressString);
        final DownloadManager.Request request;
        try {
            request = new DownloadManager.Request(uri);
        } catch (IllegalArgumentException e) {
            eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.cannot_download));
            return;
        }
        request.setMimeType(mimetype);
        // set downloaded file destination to /sdcard/Download.
        // or, should it be set to one of several Environment.DIRECTORY* dirs
        // depending on mimetype?

        final File downloadDir = new File(Environment.getExternalStorageDirectory(), "Download");
        if (!downloadDir.exists()) {
            downloadDir.mkdir();
        }
        if (!downloadDir.isDirectory()) {
            // Cannot make the directory
            eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.problem_location_download));
            return;
        }

        if (!isWriteAccessAvailable(downloadDir)) {
            eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.problem_location_download));
            return;
        }

        final Uri fileUri = Uri.fromFile(new File(downloadDir, filename));
        request.setDestinationUri(fileUri);
        // let this downloaded file be scanned by MediaScanner - so that it can
        // show up in Gallery app, for example.
        request.setVisibleInDownloadsUi(true);
        request.allowScanningByMediaScanner();
        request.setDescription(webAddress.getHost());
        // XXX: Have to use the old url since the cookies were stored using the
        // old percent-encoded url.
        String cookies = CookieManager.getInstance().getCookie(url);
        request.addRequestHeader(COOKIE_REQUEST_HEADER, cookies);
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

        final DownloadManager manager = (DownloadManager) activity
                .getSystemService(Context.DOWNLOAD_SERVICE);

        final Handler handler = new Handler(Looper.getMainLooper());
        final Runnable runnable = new Runnable() {
            @Override
            public void run() {
                try {
                    manager.enqueue(request);
                } catch (IllegalArgumentException e) {
                    // Probably got a bad URL or something
                    e.printStackTrace();
                    eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.cannot_download));
                } catch (SecurityException e) {
                    // TODO write a download utility that downloads files rather than rely on the system
                    // because the system can only handle Environment.getExternal... as a path
                    eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.problem_location_download));
                }
            }
        };
        handler.post(runnable);
    }

    private static final String sFileName = "test";
    private static final String sFileExtension = ".txt";

    /**
     * Determine whether there is write access in the given directory. Returns false if a
     * file cannot be created in the directory or if the directory does not exist.
     *
     * @param directory the directory to check for write access
     * @return returns true if the directory can be written to or is in a directory that can
     * be written to. false if there is no write access.
     */
    public static boolean isWriteAccessAvailable(File directory) {
        if (directory == null) {
            return false;
        }
        File dir = directory;
        dir = getFirstRealParentDirectory(dir);
        File file = new File(dir + sFileName + sFileExtension);
        for (int n = 0; n < 100; n++) {
            if (!file.exists()) {
                try {
                    if (file.createNewFile()) {
                        file.delete();
                    }
                    return true;
                } catch (IOException ignored) {
                    return false;
                }
            } else {
                file = new File(dir + sFileName + '-' + n + sFileExtension);
            }
        }
        return file.canWrite();
    }

    /**
     * Returns the first parent directory of a directory that exists. This is useful
     * for subdirectories that do not exist but their parents do.
     *
     * @param directory the directory to find the first existent parent
     * @return the first existent parent
     */
    private static File getFirstRealParentDirectory(File directory) {
        if (directory == null) {
            return new File("/");
        }
        File file = directory;
        if (!file.isDirectory()) {
            final File parent = file.getParentFile();
            if (parent != null) {
                return getFirstRealParentDirectory(parent);
            } else {
                return new File("/");
            }
        } else {
            return directory;
        }
    }

    private static boolean isWriteAccessAvailable(Uri fileUri) {
        File file = new File(fileUri.getPath());
        try {
            if (file.createNewFile()) {
                file.delete();
            }
            return true;
        } catch (IOException ignored) {
            return false;
        }
    }

    public static String addNecessarySlashes(String originalPath) {
        if (originalPath == null || originalPath.length() == 0) {
            return "/";
        }
        if (originalPath.charAt(originalPath.length() - 1) != '/') {
            originalPath = originalPath + '/';
        }
        if (originalPath.charAt(0) != '/') {
            originalPath = '/' + originalPath;
        }
        return originalPath;
    }

}
