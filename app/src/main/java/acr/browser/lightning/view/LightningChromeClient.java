package acr.browser.lightning.view;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.DialogInterface;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Message;
import android.support.v7.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Locale;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.bus.BrowserEvents.ShowFileChooser;
import acr.browser.lightning.utils.UrlUtils;

/**
 * @author Anthony C. Restaino
 * @author Stefano Pacifici
 */
@Deprecated
class LightningChromeClient extends WebChromeClient {

    private static final String TAG = LightningChromeClient.class.getSimpleName();
    private static final String LOG_FORMAT = "%s:%d - %s";
    private static final String[] PERMISSIONS = new String[]{Manifest.permission.ACCESS_FINE_LOCATION};

    private final Activity activity;
    private final LightningView lightningView;
    private final Bus eventBus;

    // These fields are used to avoid multiple history point creation when we receive multiple
    // titles for the same web page
    private String mLastUrl = null;
    private String mLastTitle = null;

    LightningChromeClient(Activity activity, LightningView lightningView) {
        super();
        this.activity = activity;
        this.lightningView = lightningView;
        eventBus = lightningView.eventBus;
    }

    @Override
    public void onProgressChanged(WebView view, int newProgress) {
        if (lightningView.isShown()) {
            eventBus.post(new BrowserEvents.UpdateProgress(newProgress));
        }
    }

    @Override
    public void onReceivedIcon(WebView view, Bitmap icon) {
        lightningView.mTitle.setFavicon(icon);
        //TODO it's probably irrelevant now
        eventBus.post(new Messages.UpdateFavIcon());
        if (lightningView.lightingViewListenerListener != null) {
            lightningView.lightingViewListenerListener.onFavIconLoaded(icon);
        }
    }

    @Override
    public void onReceivedTitle(WebView view, String title) {
        final String url;
        // Ensure the url is not null
        if (view != null) {
            final String tmpUrl = view.getUrl();
            url = tmpUrl != null ? tmpUrl : "";
        } else {
            url = "";
        }
        if (title != null && !title.isEmpty() &&
                !url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME) &&
                !lightningView.isUrlSSLError()) {
            lightningView.mTitle.setTitle(title);
            eventBus.post(new Messages.UpdateTitle());
        }
        if (!url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)
                && !lightningView.isIncognitoTab()) {
            if (!url.equals(mLastUrl)) {
                lightningView.addItemToHistory(title, url);
                mLastUrl = url;
                mLastTitle = title;
            } else if (title != null && !title.isEmpty() && !title.equals(mLastTitle)) {
                // urlView is the same but the titleView changed
                lightningView.updateHistoryItemTitle(title);
                mLastTitle = title;
            }
        }
        lightningView.isHistoryItemCreationEnabled = true;
        if (UrlUtils.isYoutubeVideo(url)) {
            eventBus.post(new Messages.FetchYoutubeVideoUrls());
        } else {
            eventBus.post(new Messages.SetVideoUrls(null));
        }
        lightningView.setUrlSSLError(false);
    }

    @Override
    public void onGeolocationPermissionsShowPrompt(final String origin,
                                                   final GeolocationPermissions.Callback callback) {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity, new PermissionsResultAction() {
            @Override
            public void onGranted() {
                final boolean remember = true;
                AlertDialog.Builder builder = new AlertDialog.Builder(activity);
                builder.setTitle(activity.getString(R.string.location));
                String org;
                if (origin.length() > 50) {
                    org = origin.subSequence(0, 50) + "...";
                } else {
                    org = origin;
                }
                builder.setMessage(org)
                        .setCancelable(true)
                        .setPositiveButton(activity.getString(R.string.action_allow),
                                new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int id) {
                                        callback.invoke(origin, true, remember);
                                    }
                                })
                        .setNegativeButton(activity.getString(R.string.action_dont_allow),
                                new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int id) {
                                        callback.invoke(origin, false, remember);
                                    }
                                });
                AlertDialog alert = builder.create();
                alert.show();
            }

            @Override
            public void onDenied(String permission) {
                //TODO show message and/or turn off setting
            }
        }, PERMISSIONS);
    }


    @Override
    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture,
                                  Message resultMsg) {
        eventBus.post(new BrowserEvents.CreateWindow(lightningView, resultMsg));
        return true;
    }

    @Override
    public void onCloseWindow(WebView window) {
        eventBus.post(new BrowserEvents.CloseWindow(lightningView));
    }

    @SuppressWarnings("unused")
    public void openFileChooser(ValueCallback<Uri> uploadMsg) {
        eventBus.post(new ShowFileChooser(Uri.class, uploadMsg, null, null));
    }

    @SuppressWarnings("unused")
    public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType) {
        eventBus.post(new ShowFileChooser(Uri.class, uploadMsg, acceptType, null));
    }

    @SuppressWarnings("unused")
    public void openFileChooser(ValueCallback<Uri> uploadMsg, String acceptType, String capture) {
        eventBus.post(new ShowFileChooser(Uri.class, uploadMsg, acceptType, null));
    }

    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                     WebChromeClient.FileChooserParams fileChooserParams) {
        eventBus.post(new ShowFileChooser(Uri[].class, filePathCallback,
                null, fileChooserParams));
        return true;
    }

    /**
     * Obtain an image that is displayed as a placeholder on a video until the video has initialized
     * and can begin loading.
     *
     * @return a Bitmap that can be used as a place holder for videos.
     */
    @Override
    public Bitmap getDefaultVideoPoster() {
        if (activity == null) {
            return null;
        }
        final Resources resources = activity.getResources();
        return BitmapFactory.decodeResource(resources, android.R.drawable.spinner_background);
    }

    /**
     * Inflate a view to send to a LightningView when it needs to display a video and has to
     * show a loading dialog. Inflates a progress view and returns it.
     *
     * @return A view that should be used to display the state
     * of a video's loading progress.
     */
    @SuppressLint("InflateParams")
    @Override
    public View getVideoLoadingProgressView() {
        LayoutInflater inflater = LayoutInflater.from(activity);
        return inflater.inflate(R.layout.video_loading_progress, null);
    }

    @Override
    public void onHideCustomView() {
        eventBus.post(new BrowserEvents.HideCustomView());
    }

    @Override
    public void onShowCustomView(View view, CustomViewCallback callback) {
        eventBus.post(new BrowserEvents.ShowCustomView(view, callback));
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onShowCustomView(View view, int requestedOrientation, CustomViewCallback callback) {
        eventBus.post(new BrowserEvents.ShowCustomView(view, callback, requestedOrientation));
    }

    @Override
    public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
        if (BuildConfig.DEBUG) {
            final String message = String.format(Locale.US, LOG_FORMAT, consoleMessage.sourceId(),
                    consoleMessage.lineNumber(), consoleMessage.message());
            switch (consoleMessage.messageLevel()) {
                case DEBUG:
                    Log.d(TAG, message);
                    break;
                case ERROR:
                    Log.e(TAG, message);
                    break;
                case WARNING:
                    Log.w(TAG, message);
                    break;
                case LOG:
                    Log.i(TAG, message);
                    break;
                default:
                    Log.v(TAG, message);
                    break;
            }
        }
        return true;
    }
}
