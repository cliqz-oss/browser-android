package acr.browser.lightning.view;

import android.Manifest;
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
import android.webkit.GeolocationPermissions;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.bus.BrowserEvents.ShowFileChooser;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;

/**
 * @author Stefano Pacifici based on Anthony C. Restaino code
 * @date 2015/09/21
 */
class LightningChromeClient extends WebChromeClient {

    private static final String[] PERMISSIONS = new String[]{Manifest.permission.ACCESS_FINE_LOCATION};

    private final Activity activity;
    private final LightningView lightningView;
    private final Bus eventBus;

    // These fields are used to avoid multiple history point creation when we receive multiple
    // titles for the same web page
    private String mLastUrl = null;

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
        eventBus.post(new BrowserEvents.TabsChanged());
        eventBus.post(new Messages.UpdateTabsOverview());
        cacheFavicon(view.getUrl(), icon);
    }

    /**
     * Naive caching of the favicon according to the domain name of the URL
     *
     * @param icon the icon to cache
     */
    private static void cacheFavicon(final String url, final Bitmap icon) {
        if (icon == null) return;
        final Uri uri = Uri.parse(url);
        if (uri.getHost() == null) {
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                String hash = String.valueOf(uri.getHost().hashCode());
                Log.d(Constants.TAG, "Caching icon for " + uri.getHost());
                FileOutputStream fos = null;
                try {
                    File image = new File(BrowserApp.getAppContext().getCacheDir(), hash + ".png");
                    fos = new FileOutputStream(image);
                    icon.compress(Bitmap.CompressFormat.PNG, 100, fos);
                    fos.flush();
                } catch (IOException e) {
                    e.printStackTrace();
                } finally {
                    Utils.close(fos);
                }
            }
        }).start();
    }


    @Override
    public void onReceivedTitle(WebView view, String title) {
        final String url = view != null ? view.getUrl() : null;
        if (title != null && !title.isEmpty() &&
                !TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO.equals(url)) {
            lightningView.mTitle.setTitle(title);
            eventBus.post(new Messages.UpdateTitle());
            eventBus.post(new Messages.UpdateTabsOverview());
        }
        eventBus.post(new BrowserEvents.TabsChanged());
        if (url != null
                && !url.startsWith("cliqz://")
                && !lightningView.mIsIncognitoTab
                && !url.equals(mLastUrl)) {
            lightningView.addItemToHistory(title, url);
            mLastUrl = url;
        }
        lightningView.isHistoryItemCreationEnabled = true;
        if (UrlUtils.isYoutubeVideo(url)) {
            eventBus.post(new Messages.FetchYoutubeVideoUrls());
        } else {
            eventBus.post(new Messages.SetVideoUrls(null));
        }
    }

    @Override
    public void onGeolocationPermissionsShowPrompt(final String origin,
                                                   final GeolocationPermissions.Callback callback) {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity, PERMISSIONS, new PermissionsResultAction() {
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
                builder.setMessage(org + activity.getString(R.string.message_location))
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
        });
    }


    @Override
    public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture,
                                  Message resultMsg) {
        eventBus.post(new BrowserEvents.CreateWindow(resultMsg));
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
}
