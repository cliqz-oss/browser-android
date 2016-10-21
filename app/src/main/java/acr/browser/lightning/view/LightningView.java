/*
 * Copyright 2014 A.C.R. Development
 */

package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.database.sqlite.SQLiteException;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Message;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.util.ArrayMap;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebSettings.LayoutAlgorithm;
import android.webkit.WebSettings.PluginState;
import android.webkit.WebView;

import com.cliqz.antitracking.AntiTracking;
import com.cliqz.browser.R;
import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.main.TrackerDetailsModel;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.dialog.LightningDialogBuilder;
import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.preference.PreferenceManager;

public class LightningView {

    public static final String HEADER_REQUESTED_WITH = "X-Requested-With";
    public static final String HEADER_WAP_PROFILE = "X-Wap-Profile";
    public static final String HEADER_DNT = "DNT";
    private static final String TAG = LightningView.class.getSimpleName();

    final LightningViewTitle mTitle;
    private CliqzWebView mWebView;
    private boolean mIsIncognitoTab;
    final Activity activity;
    private final Paint mPaint = new Paint();
    private boolean isForegroundTab;
    private boolean mInvertPage = false;
    private boolean mToggleDesktop = false;
    private static final int API = android.os.Build.VERSION.SDK_INT;
    private final String mId;
    boolean clicked = false;
    private boolean mIsAutoForgetTab;

    /**
     * This prevent history point creation when navigating back and forward. It's used by {@link
     * LightningView} and {@link LightningChromeClient} in combination: the first set it to false
     * when navigation back or forward, the latter reset it at the end of {@link
     * LightningChromeClient#onReceivedTitle(WebView, String)}
     */
    boolean isHistoryItemCreationEnabled = true;

    private static final float[] mNegativeColorArray = {
            -1.0f, 0, 0, 0, 255, // red
            0, -1.0f, 0, 0, 255, // green
            0, 0, -1.0f, 0, 255, // blue
            0, 0, 0, 1.0f, 0 // alpha
    };
    final WebViewHandler webViewHandler = new WebViewHandler(this);
    private final Map<String, String> mRequestHeaders = new ArrayMap<>();

    //Id of the current page in the history database
    public long historyId = -1;

    @Inject
    Bus eventBus;

    @Inject
    PreferenceManager preferences;

    @Inject
    LightningDialogBuilder dialogBuilder;

    @Inject
    AntiTracking attrack;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    Telemetry telemetry;

    // Removed as version 1.0.2r2
    // @Inject
    // ProxyUtils proxyUtils;

    @Inject
    PasswordManager passwordManager;

    @Inject
    AntiPhishing antiPhishing;

    @Inject
    BloomFilterUtils bloomFilterUtils;

    @SuppressLint("NewApi")
    public LightningView(final Activity activity, boolean isIncognito, String uniqueId) {
        final ActivityComponent component = BrowserApp.getActivityComponent(activity);
        if (component != null) {
            component.inject(this);
        }
        this.activity = activity;
        mId = uniqueId;
        mWebView = /* overrideWebView != null ? overrideWebView : */new CliqzWebView(activity);
        mIsIncognitoTab = isIncognito;
        Boolean useDarkTheme = preferences.getUseTheme() != 0 || isIncognito;
        mTitle = new LightningViewTitle(activity, useDarkTheme);

        mWebView.setDrawingCacheBackgroundColor(Color.WHITE);
        mWebView.setFocusableInTouchMode(true);
        mWebView.setFocusable(true);
        mWebView.setDrawingCacheEnabled(false);
        mWebView.setWillNotCacheDrawing(true);

        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.LOLLIPOP_MR1) {
            //noinspection deprecation
            mWebView.setAnimationCacheEnabled(false);
            //noinspection deprecation
            mWebView.setAlwaysDrawnWithCacheEnabled(false);
        }
        mWebView.setBackgroundColor(Color.WHITE);

        mWebView.setScrollbarFadingEnabled(true);

        mWebView.setSaveEnabled(true);
        mWebView.setNetworkAvailable(true);
        mWebView.setWebChromeClient(new LightningChromeClient(activity, this));
        mWebView.setWebViewClient(new LightningWebClient(activity, this));
        mWebView.setDownloadListener(new LightningDownloadListener(activity));
        LightningViewTouchHandler.attachTouchListener(this);
        initializeSettings(mWebView.getSettings(), activity);
    }

    /**
     * Initialize the preference driven settings of the WebView
     *
     * @param settings the WebSettings object to use, you can pass in null
     *                 if you don't have a reference to them
     * @param context  the activity in which the WebView was created
     */
    @SuppressLint("NewApi")
    public synchronized void initializePreferences(@Nullable WebSettings settings, Context context) {
        if (settings == null && mWebView == null) {
            return;
        } else if (settings == null) {
            settings = mWebView.getSettings();
        }

        // Removed as version 1.0.2r2, restore if needed
        // settings.setDefaultTextEncodingName(preferences.getTextEncoding());
        settings.setDefaultTextEncodingName("UTF-8");

        //This should be replaced with regular preferences
        attrack.setEnabled(true);
        attrack.setAdblockEnabled(preferences.getAdBlockEnabled());
        setColorMode(preferences.getRenderingMode());

        if (preferences.getDoNotTrackEnabled()) {
            mRequestHeaders.put(HEADER_DNT, "1");
        } else {
            mRequestHeaders.remove(HEADER_DNT);
        }

        if (preferences.getRemoveIdentifyingHeadersEnabled()) {
            mRequestHeaders.put(HEADER_REQUESTED_WITH, "");
            mRequestHeaders.put(HEADER_WAP_PROFILE, "");
        } else {
            mRequestHeaders.remove(HEADER_REQUESTED_WITH);
            mRequestHeaders.remove(HEADER_WAP_PROFILE);
        }

        if (!mIsIncognitoTab) {
            settings.setGeolocationEnabled(preferences.getLocationEnabled());
        } else {
            settings.setGeolocationEnabled(false);
        }
        if (API < Build.VERSION_CODES.KITKAT) {
            switch (preferences.getFlashSupport()) {
                case 0:
                    //noinspection deprecation
                    settings.setPluginState(PluginState.OFF);
                    break;
                case 1:
                    //noinspection deprecation
                    settings.setPluginState(PluginState.ON_DEMAND);
                    break;
                case 2:
                    //noinspection deprecation
                    settings.setPluginState(PluginState.ON);
                    break;
                default:
                    break;
            }
        }

        // Removed as version 1.0.2r2, restore if needed
        // setUserAgent(context, preferences.getUserAgentChoice());
        // settings.setUserAgentString(WebSettings.getDefaultUserAgent(activity));

        if (API <= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            //noinspection deprecation
            settings.setSavePassword(false);
        }
        // Removed as version 1.0.2r2, restore if needed
        // if (preferences.getJavaScriptEnabled()) {
            settings.setJavaScriptEnabled(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // } else {
        //     settings.setJavaScriptEnabled(false);
        //     settings.setJavaScriptCanOpenWindowsAutomatically(false);
        // }

        if (preferences.getTextReflowEnabled()) {
            settings.setLayoutAlgorithm(LayoutAlgorithm.NARROW_COLUMNS);
            if (API >= android.os.Build.VERSION_CODES.KITKAT) {
                try {
                    settings.setLayoutAlgorithm(LayoutAlgorithm.TEXT_AUTOSIZING);
                } catch (Exception e) {
                    // This shouldn't be necessary, but there are a number
                    // of KitKat devices that crash trying to set this
                    Log.e(Constants.TAG, "Problem setting LayoutAlgorithm to TEXT_AUTOSIZING");
                }
            }
        } else {
            settings.setLayoutAlgorithm(LayoutAlgorithm.NORMAL);
        }

        // This was disabled for version 1.0.2r2, please restore if needed needed
        // settings.setBlockNetworkImage(preferences.getBlockImagesEnabled());
        if (!mIsIncognitoTab) {
            settings.setSupportMultipleWindows(preferences.getPopupsEnabled());
        } else {
            settings.setSupportMultipleWindows(false);
        }
        settings.setUseWideViewPort(preferences.getUseWideViewportEnabled());
        settings.setLoadWithOverviewMode(preferences.getOverviewModeEnabled());
        switch (preferences.getTextSize()) {
            case 0:
                settings.setTextZoom(200);
                break;
            case 1:
                settings.setTextZoom(150);
                break;
            case 2:
                settings.setTextZoom(125);
                break;
            case 3:
                settings.setTextZoom(100);
                break;
            case 4:
                settings.setTextZoom(75);
                break;
            case 5:
                settings.setTextZoom(50);
                break;
        }
        CookieManager.getInstance().setAcceptCookie(preferences.getCookiesEnabled());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(mWebView, false);
        }
    }

    /**
     * Initialize the settings of the WebView that are intrinsic to Lightning and cannot
     * be altered by the user. Distinguish between Incognito and Regular tabs here.
     *
     * @param settings the WebSettings object to use.
     * @param context  the Context which was used to construct the WebView.
     */
    @SuppressLint("NewApi")
    private void initializeSettings(WebSettings settings, Context context) {
        if (API < Build.VERSION_CODES.JELLY_BEAN_MR2) {
            //noinspection deprecation
            settings.setAppCacheMaxSize(Long.MAX_VALUE);
        }
        if (API < Build.VERSION_CODES.JELLY_BEAN_MR1) {
            //noinspection deprecation
            settings.setEnableSmoothTransition(true);
        }
        if (API > Build.VERSION_CODES.JELLY_BEAN) {
            settings.setMediaPlaybackRequiresUserGesture(true);
        }
        if (API >= Build.VERSION_CODES.LOLLIPOP && !mIsIncognitoTab) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        } else if (API >= Build.VERSION_CODES.LOLLIPOP) {
            // We're in Incognito mode, reject
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        if (!mIsIncognitoTab) {
            settings.setDomStorageEnabled(true);
            settings.setAppCacheEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDatabaseEnabled(true);
        } else {
            settings.setDomStorageEnabled(false);
            settings.setAppCacheEnabled(false);
            settings.setDatabaseEnabled(false);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        }
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setDefaultTextEncodingName("utf-8");
        // setAccessFromUrl(url, settings);
        if (API >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        settings.setAppCachePath(context.getDir("appcache", 0).getPath());
        settings.setGeolocationDatabasePath(context.getDir("geolocation", 0).getPath());
        if (API < Build.VERSION_CODES.KITKAT) {
            //noinspection deprecation
            settings.setDatabasePath(context.getDir("databases", 0).getPath());
        }
    }

    public void toggleDesktopUA(@NonNull Context context) {
        if (mWebView == null)
            return;
        if (!mToggleDesktop) {
            mWebView.getSettings().setUserAgentString(Constants.DESKTOP_USER_AGENT);
        } else {
            // Removed as version 1.0.2r2, restore if needed
            // setUserAgent(context, preferences.getUserAgentChoice());
            mWebView.getSettings().setUserAgentString(WebSettings.getDefaultUserAgent(context));
        }
        mToggleDesktop = !mToggleDesktop;
    }

    // Removed as version 1.0.2r2, restore if needed
    //    @SuppressLint("NewApi")
    //    private void setUserAgent(Context context, int choice) {
    //        if (mWebView == null) return;
    //        WebSettings settings = mWebView.getSettings();
    //        switch (choice) {
    //            case 1:
    //                if (API >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
    //                    settings.setUserAgentString(WebSettings.getDefaultUserAgent(context));
    //                } else {
    //                    settings.setUserAgentString(mDefaultUserAgent);
    //                }
    //                break;
    //            case 2:
    //                settings.setUserAgentString(Constants.DESKTOP_USER_AGENT);
    //                break;
    //            case 3:
    //                settings.setUserAgentString(Constants.MOBILE_USER_AGENT);
    //                break;
    //            case 4:
    //                String ua = preferences.getUserAgentString(mDefaultUserAgent);
    //                if (ua == null || ua.isEmpty()) {
    //                    ua = " ";
    //                }
    //                settings.setUserAgentString(ua);
    //                break;
    //        }
    //    }

    @NonNull
    protected Map<String, String> getRequestHeaders() {
        return mRequestHeaders;
    }

    public boolean isShown() {
        return mWebView != null && mWebView.isShown();
    }

    public synchronized void onPause() {
        if (mWebView != null) {
            //mWebView.onPause();
        }
    }

    public synchronized void onResume() {
        if (mWebView != null) {
            Log.w(LightningView.class.getSimpleName(), "Resuming");
            initializePreferences(mWebView.getSettings(), activity);
            mWebView.onResume();
        }
    }

    public synchronized void freeMemory() {
        if (mWebView != null && Build.VERSION.SDK_INT < Build.VERSION_CODES.KITKAT) {
            //noinspection deprecation
            mWebView.freeMemory();
        }
    }

    public void setForegroundTab(boolean isForeground) {
        isForegroundTab = isForeground;
        eventBus.post(new BrowserEvents.TabsChanged());
    }

    public boolean isForegroundTab() {
        return isForegroundTab;
    }

    public int getProgress() {
        if (mWebView != null) {
            return mWebView.getProgress();
        } else {
            return 100;
        }
    }

    public synchronized void stopLoading() {
        if (mWebView != null) {
            mWebView.stopLoading();
        }
    }

    private void setHardwareRendering() {
        mWebView.setLayerType(View.LAYER_TYPE_HARDWARE, mPaint);
    }

    private void setNormalRendering() {
        mWebView.setLayerType(View.LAYER_TYPE_NONE, null);
    }

    public void setSoftwareRendering() {
        mWebView.setLayerType(View.LAYER_TYPE_SOFTWARE, null);
    }

    private void setColorMode(int mode) {
        mInvertPage = false;
        switch (mode) {
            case 0:
                mPaint.setColorFilter(null);
                // setSoftwareRendering(); // Some devices get segfaults
                // in the WebView with Hardware Acceleration enabled,
                // the only fix is to disable hardware rendering
                setNormalRendering();
                mInvertPage = false;
                break;
            case 1:
                ColorMatrixColorFilter filterInvert = new ColorMatrixColorFilter(
                        mNegativeColorArray);
                mPaint.setColorFilter(filterInvert);
                setHardwareRendering();

                mInvertPage = true;
                break;
            case 2:
                ColorMatrix cm = new ColorMatrix();
                cm.setSaturation(0);
                ColorMatrixColorFilter filterGray = new ColorMatrixColorFilter(cm);
                mPaint.setColorFilter(filterGray);
                setHardwareRendering();
                break;
            case 3:
                ColorMatrix matrix = new ColorMatrix();
                matrix.set(mNegativeColorArray);
                ColorMatrix matrixGray = new ColorMatrix();
                matrixGray.setSaturation(0);
                ColorMatrix concat = new ColorMatrix();
                concat.setConcat(matrix, matrixGray);
                ColorMatrixColorFilter filterInvertGray = new ColorMatrixColorFilter(concat);
                mPaint.setColorFilter(filterInvertGray);
                setHardwareRendering();

                mInvertPage = true;
                break;

        }

    }

    public synchronized void pauseTimers() {
        if (mWebView != null) {
           // mWebView.onPause();
        }
    }

    public synchronized void resumeTimers() {
        if (mWebView != null) {
            mWebView.onResume();
        }
    }

    public void requestFocus() {
        if (mWebView != null && !mWebView.hasFocus()) {
            mWebView.requestFocus();
        }
    }

    public void setVisibility(int visible) {
        if (mWebView != null) {
            mWebView.setVisibility(visible);
        }
    }

    public synchronized void reload() {
        // Removed as version 1.0.2r2
        // Check if configured proxy is available
        // if (!isProxyReady()) {
        //     return;
        // }
        if (mWebView != null) {
            isHistoryItemCreationEnabled = false;
            mWebView.reload();
        }
    }

    /**
     * Naive caching of the favicon according to the domain name of the URL
     *
     * @param icon the icon to cache
     */
    private void cacheFavicon(final Bitmap icon) {
        if (icon == null) return;
        final Uri uri = Uri.parse(getUrl());
        if (uri.getHost() == null) {
            return;
        }
        new Thread(new IconCacheTask(uri, icon)).start();
    }

    @SuppressLint("NewApi")
    public synchronized void findInPage(String text) {
        if (mWebView != null) {
            if (API >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
                mWebView.findAllAsync(text);
            } else {
                //noinspection deprecation
                mWebView.findAll(text);
            }
        }
    }

    public synchronized void onDestroy() {
        if (mWebView != null) {
            //deletePreview();
            // Check to make sure the WebView has been removed
            // before calling destroy() so that a memory leak is not created
            ViewGroup parent = (ViewGroup) mWebView.getParent();
            if (parent != null) {
                parent.removeView(mWebView);
            }
            mWebView.stopLoading();
            mWebView.onPause();
            mWebView.clearHistory();
            mWebView.setVisibility(View.GONE);
            mWebView.removeAllViews();
            mWebView.destroyDrawingCache();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR2) {
                //this is causing the segfault occasionally below 4.2
                mWebView.destroy();
            }
            mWebView = null;
        }
    }

    public synchronized void goBack() {
        if (mWebView != null) {
            isHistoryItemCreationEnabled = false;
            mWebView.goBack();
        }
    }

    private String getUserAgent() {
        if (mWebView != null) {
            return mWebView.getSettings().getUserAgentString();
        } else {
            return "";
        }
    }

    public synchronized void goForward() {
        if (mWebView != null) {
            isHistoryItemCreationEnabled = false;
            mWebView.goForward();
        }
    }

    public synchronized void findNext() {
        if (mWebView != null) {
            mWebView.findNext(true);
        }
    }

    public synchronized void findPrevious() {
        if (mWebView != null) {
            mWebView.findNext(false);
        }
    }

    public synchronized void clearFindMatches() {
        if (mWebView != null) {
            mWebView.clearMatches();
        }
    }

    /**
     * Used by {@link LightningWebClient}
     *
     * @return true if the page is in inverted mode, false otherwise
     */
    public boolean getInvertePage() {
        return mInvertPage;
    }

    /**
     * handles a long click on the page, parameter String url
     * is the url that should have been obtained from the WebView touch node
     * thingy, if it is null, this method tries to deal with it and find a workaround
     */
    private void longClickPage(final String url) {
        final WebView.HitTestResult result = mWebView.getHitTestResult();
            if (url != null) {
                if (result != null) {
                    if (result.getType() == WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE || result.getType() == WebView.HitTestResult.IMAGE_TYPE) {
                    dialogBuilder.showLongPressImageDialog(url, getUserAgent());
                    } else {
                    dialogBuilder.showLongPressLinkDialog(url, getUserAgent());
                    }
                } else {
                dialogBuilder.showLongPressLinkDialog(url, getUserAgent());
                }
            } else if (result != null && result.getExtra() != null) {
                final String newUrl = result.getExtra();
                if (result.getType() == WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE || result.getType() == WebView.HitTestResult.IMAGE_TYPE) {
                dialogBuilder.showLongPressImageDialog(newUrl, getUserAgent());
                } else {
                dialogBuilder.showLongPressLinkDialog(newUrl, getUserAgent());
                }
            }
    }

    public boolean canGoBack() {
        return mWebView != null && mWebView.canGoBack();
    }

    public boolean canGoForward() {
        return mWebView != null && mWebView.canGoForward();
    }

    @Nullable
    public synchronized WebView getWebView() {
        return mWebView;
    }

    public Bitmap getFavicon() {
        return mTitle.getFavicon();
    }

    public synchronized void loadUrl(String url) {
        // Removed as version 1.0.2r2
        // Check if configured proxy is available
        // if (!isProxyReady()) {
        //     return;
        // }
            mWebView.loadUrl(url, mRequestHeaders);
    }

    public synchronized void invalidate() {
        if (mWebView != null) {
            mWebView.invalidate();
        }
    }

    public String getTitle() {
        return mTitle.getTitle();
    }

    @NonNull
    public String getUrl() {
        if (mWebView != null && mWebView.getUrl() != null) {
            return mWebView.getUrl();
        } else {
            return "";
        }
    }

    public String getId() {
        return mId;
    }

    // Removed as version 1.0.2r2
    //    boolean isProxyReady() {
    //        switch (proxyUtils.getProxyState()) {
    //            case I2P_NOT_RUNNING:
    //                eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.i2p_not_running));
    //                return false;
    //            case I2P_TUNNELS_NOT_READY:
    //                eventBus.post(new BrowserEvents.ShowSnackBarMessage(R.string.i2p_tunnels_not_ready));
    //                return false;
    //            default:
    //                return true;
    //        }
    //    }

    public boolean isIncognitoTab() {
        return mIsIncognitoTab;
    }

    public void setIsIncognitoTab(boolean isIncognitoTab) {
        this.mIsIncognitoTab = isIncognitoTab;
    }

    public boolean isAutoForgetTab() {
        return mIsAutoForgetTab;
    }

    public void setIsAutoForgetTab(boolean isAutoForgetTab) {
        this.mIsAutoForgetTab = isAutoForgetTab;
    }

    static class WebViewHandler extends Handler {

        private WeakReference<LightningView> mReference;

        public WebViewHandler(LightningView view) {
            mReference = new WeakReference<>(view);
        }

        @Override
        public void handleMessage(Message msg) {
            super.handleMessage(msg);
            final String url = msg.getData().getString("url");
            LightningView view = mReference.get();
            if (view != null) {
                view.longClickPage(url);
            }
        }
    }

    //Saves the screenshot of the tab. The image name is the "id" of the tab.
    public void savePreview() {
        ViewParent viewParent = mWebView.getParent();
        if (viewParent != null) {
            throw new RuntimeException("Do not take screenshots when you are attached");
        }
        final int scrollX = mWebView.getScrollX();
        final int scrollY = mWebView.getScrollY();
        mWebView.scrollTo(0, 0);
        final int width = mWebView.getWidth();
        final int height = width /3 * 4;
        final Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        final Canvas canvas = new Canvas(bitmap);
        mWebView.draw(canvas);
        mWebView.scrollTo(scrollX, scrollY);
        try {
            File directory = activity.getDir(Constants.TABS_SCREENSHOT_FOLDER_NAME, Context.MODE_PRIVATE);
            File file = new File(directory, mId + ".jpeg");
            FileOutputStream fileOutputStream = new FileOutputStream(file);
            bitmap.compress(Bitmap.CompressFormat.JPEG, 40, fileOutputStream);
            fileOutputStream.flush();
            fileOutputStream.close();
            bitmap.recycle();
        } catch (FileNotFoundException e) {
            Log.e(Constants.TAG, "FileNotFoundException in savePreview", e);
        } catch (IOException e) {
            Log.e(Constants.TAG, "IOException in savePreview", e);
        }
    }

    //deletes the screenshot of the tab being deleted.
    private void deletePreview() {
        File directory = activity
                .getDir(Constants.TABS_SCREENSHOT_FOLDER_NAME, Context.MODE_PRIVATE);
        File file = new File(directory, mId + ".jpeg");
        file.delete();
    }


    void addItemToHistory(@Nullable final String title, @NonNull final String url) {
        Runnable update = new Runnable() {
            @Override
            public void run() {
                try {
                   LightningView.this.historyId = historyDatabase.visitHistoryItem(url, title);
                } catch (IllegalStateException e) {
                    Log.e(Constants.TAG, "IllegalStateException in updateHistory", e);
                } catch (NullPointerException e) {
                    Log.e(Constants.TAG, "NullPointerException in updateHistory", e);
                } catch (SQLiteException e) {
                    Log.e(Constants.TAG, "SQLiteException in updateHistory", e);
                }
            }
        };
        if (!url.startsWith(Constants.FILE)) {
            new Thread(update).start();
        }
    }

    /**
     * Gets a JSONObject containing info about the trackers from the Antitracking module and processes
     * it and returns an ArrayList of Trackers
     * @return ArrayList of TrackerDetailsModel objects. TrackerDetailsModel has the name of the trackers and no of
     * data points blocked for each tracker
     * This method is not called in the xwalk build variant
     */
    public @NonNull ArrayList<TrackerDetailsModel> getTrackerDetails() {
        final ArrayList<TrackerDetailsModel> trackerDetails = new ArrayList<>();
        try {
            final JSONObject jsonObject = attrack.getTabBlockingInfo(mWebView.hashCode());
            final JSONArray companies = jsonObject.getJSONObject("companies").names();
            if (companies == null) {
                return trackerDetails;
            }
            for (int i = 0; i < companies.length(); i++) {
                final String key = companies.getString(i);
                final JSONArray domains = jsonObject.getJSONObject("companies").getJSONArray(key);
                int trackersCount = 0;
                for (int j = 0; j < domains.length(); j++) {
                    final JSONObject trackers = jsonObject.getJSONObject("trackers").getJSONObject(domains.optString(j));
                    trackersCount += trackers.optInt("bad_qs",0) + trackers.optInt("adblock_block",0);
                }
                if (trackersCount > 0) {
                    trackerDetails.add(new TrackerDetailsModel(key, trackersCount));
                }
            }
            Collections.sort(trackerDetails, new Comparator<TrackerDetailsModel>() {
                @Override
                public int compare(TrackerDetailsModel lhs, TrackerDetailsModel rhs) {
                    final int count = rhs.trackerCount - lhs.trackerCount;
                    return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
                }
            });
            return trackerDetails;
        } catch (JSONException e) {
            Log.e(TAG, "Can't parse json from antitracking module", e);
        } catch (NullPointerException e) {
            Log.d(TAG, "Null webView", e);
        }
            return trackerDetails;
        }

}
