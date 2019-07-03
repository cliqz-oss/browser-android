package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Message;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebSettings.LayoutAlgorithm;
import android.webkit.WebSettings.PluginState;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.collection.ArrayMap;

import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.Engine;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.cliqz.nove.Bus;

import java.lang.ref.WeakReference;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.dialog.LightningDialogBuilder;
import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Anthony C. Restaino
 * @author Stefano Pacifici
 * @author Ravjit Uppal
 */
public class LightningView {

    private static final String HEADER_REQUESTED_WITH = "X-Requested-With";
    private static final String HEADER_WAP_PROFILE = "X-Wap-Profile";
    private static final String HEADER_DNT = "DNT";
    private static final String TAG = LightningView.class.getSimpleName();
    private static final Pattern USER_AGENT_PATTERN =
            Pattern.compile("(.*);\\s+wv(.*)( Version/(\\d+\\.?)+)(.*)");

    final LightningViewTitle mTitle;
    private CliqzWebView mWebView;
    private boolean mIsIncognitoTab;
    final Activity activity;
    private final Paint mPaint = new Paint();
    private boolean mInvertPage = false;
    private static final int API = android.os.Build.VERSION.SDK_INT;
    private final String id;
    private boolean mIsAutoForgetTab;
    private boolean urlSSLError = false;
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
    long historyId = -1;

    LightingViewListener lightingViewListenerListener;

    public void setUrlSSLError(boolean urlSSLError) {
        this.urlSSLError = urlSSLError;
    }

    public boolean isUrlSSLError() {
        return urlSSLError;
    }

    public interface LightingViewListener {

        void increaseAntiTrackingCounter();

        void onFavIconLoaded(Bitmap favicon);
    }

    @Inject
    Bus eventBus;

    @Inject
    PreferenceManager preferences;

    @Inject
    LightningDialogBuilder dialogBuilder;

    @Inject
    Engine jsengine;

    @Inject
    AntiTracking attrack;

    @Inject
    Adblocker adblocker;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    Telemetry telemetry;

    @Inject
    PasswordManager passwordManager;

    @Inject
    AntiPhishing antiPhishing;

    @Inject
    BloomFilterUtils bloomFilterUtils;

    @Inject
    WebViewPersister persister;

    @SuppressLint("NewApi")
    public LightningView(final Activity activity, boolean isIncognito, String uniqueId) {
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(activity);
        if (component != null) {
            component.inject(this);
        }
        this.activity = activity;
        id = uniqueId;
        mIsIncognitoTab = isIncognito;
        Boolean useDarkTheme = preferences.getUseTheme() != 0 || isIncognito;
        mTitle = new LightningViewTitle(activity, useDarkTheme);
        LightningViewTouchHandler.attachTouchListener(this);
    }

    /**
     * Initialize the preference driven settings of the WebView
     *
     * @param settings the WebSettings object to use, you can pass in null
     *                 if you don't have a reference to them
     */
    @SuppressLint({"NewApi", "SetJavaScriptEnabled"})
    private synchronized void initializePreferences(@Nullable WebSettings settings) {
        if (settings == null && mWebView == null) {
            return;
        } else if (settings == null) {
            settings = mWebView.getSettings();
        }

        // Removed as version 1.0.2r2, restore if needed
        // settings.setDefaultTextEncodingName(preferences.getTextEncoding());
        settings.setDefaultTextEncodingName("UTF-8");
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

        settings.setGeolocationEnabled(!mIsIncognitoTab);

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

        settings.setUserAgentString(getMobileUserAgent());

        if (API <= Build.VERSION_CODES.JELLY_BEAN_MR2) {
            //noinspection deprecation
            settings.setSavePassword(false);
        }
        settings.setJavaScriptEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

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
        CookieManager.getInstance().setAcceptCookie(preferences.getCookiesEnabled() && !isIncognitoTab());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            CookieManager.getInstance().setAcceptThirdPartyCookies(mWebView, false);
        }

        // update jsengine module states.
        try {
            attrack.setEnabled(preferences.isAttrackEnabled());
            adblocker.setEnabled(preferences.getAdBlockEnabled());
        } catch (EngineNotYetAvailable e) {
            Log.w(TAG, "error updating jsengine state", e);
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
        // setAccessFromUrl(urlView, settings);
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

    boolean isShown() {
        return mWebView != null && mWebView.isShown();
    }

    public synchronized void onResume() {
        if (mWebView != null) {
            Log.w(LightningView.class.getSimpleName(), "Resuming");
            initializePreferences(mWebView.getSettings());
            mWebView.onResume();
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

    public synchronized void resumeTimers() {
        if (mWebView != null) {
            mWebView.onResume();
        }
    }

    public void setVisibility(int visible) {
        if (mWebView != null) {
            mWebView.setVisibility(visible);
        }
    }

    public synchronized void reload() {
        if (mWebView != null) {
            isHistoryItemCreationEnabled = false;
            mWebView.reload();
        }
    }

    @SuppressLint("NewApi")
    public synchronized void findInPage(String text) {
            mWebView.findAllAsync(text);
    }

    @SuppressLint("ObsoleteSdkInt")
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

    /**
     * Used by {@link LightningWebClient}
     *
     * @return true if the page is in inverted mode, false otherwise
     */
    boolean getInvertePage() {
        return mInvertPage;
    }

    /**
     * handles a long click on the page, parameter String urlView
     * is the urlView that should have been obtained from the WebView touch node
     * thingy, if it is null, this method tries to deal with it and find a workaround
     */
    private void longClickPage(final String url) {
        if (mWebView == null) {
            return;
        }
        final WebView.HitTestResult result = mWebView.getHitTestResult();
        if (url != null) {
            if (result != null) {
                if (result.getType() == WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE || result.getType() == WebView.HitTestResult.IMAGE_TYPE) {
                    final String imageUrl = result.getExtra();
                    dialogBuilder.showLongPressImageDialog(url, imageUrl, getUserAgent());
                } else {
                    dialogBuilder.showLongPressLinkDialog(url, getUserAgent());
                }
            } else {
                dialogBuilder.showLongPressLinkDialog(url, getUserAgent());
            }
        } else if (result != null && result.getExtra() != null) {
            final String newUrl = result.getExtra();
            if (result.getType() == WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE || result.getType() == WebView.HitTestResult.IMAGE_TYPE) {
                dialogBuilder.showLongPressImageDialog(null, newUrl, getUserAgent());
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

    @NonNull
    public synchronized WebView getWebView() {
        if (mWebView == null) {
            mWebView = new CliqzWebView(activity);
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

            mWebView.setSaveEnabled(true);
            mWebView.setNetworkAvailable(true);
            mWebView.setWebChromeClient(new LightningChromeClient(activity, this));
            mWebView.setWebViewClient(new LightningWebClient(activity, this));
            mWebView.setDownloadListener(new LightningDownloadListener(activity));
            initializeSettings(mWebView.getSettings(), activity);
            persister.restore(id, mWebView);
        }
        return mWebView;
    }

    public Bitmap getFavicon() {
        return mTitle.getFavicon();
    }

    public synchronized void loadUrl(String url) {
        if (mWebView != null && url != null) {
            mWebView.loadUrl(url, mRequestHeaders);
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
        return id;
    }

    public boolean isIncognitoTab() {
        return mIsIncognitoTab;
    }

    public void setIsIncognitoTab(boolean isIncognitoTab) {
        this.mIsIncognitoTab = isIncognitoTab;
    }

    boolean isAutoForgetTab() {
        return mIsAutoForgetTab;
    }

    public void setIsAutoForgetTab(boolean isAutoForgetTab) {
        this.mIsAutoForgetTab = isAutoForgetTab;
    }

    public void enableAdBlock() {
        try {
            adblocker.setEnabled(true);
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            engineNotYetAvailable.printStackTrace();
        }
    }

    public void enableAttrack(){
        try {
            attrack.setEnabled(true);
        } catch (EngineNotYetAvailable engineNotYetAvailable) {
            engineNotYetAvailable.printStackTrace();
        }
    }

    public void setDesktopUserAgent() {
        if (mWebView == null) {
            return;
        }
        final WebSettings webSettings = mWebView.getSettings();
        webSettings.setUserAgentString(Constants.DESKTOP_USER_AGENT);
        final String url = mWebView.getUrl();
        if (url != null && (
                (url.startsWith("m.") || url.contains("/m.")))) {
            mWebView.loadUrl(url.replaceFirst("m.", ""));
        } else {
            mWebView.reload();
        }
    }

    public void setMobileUserAgent() {
        if (mWebView == null) {
            return;
        }

        final WebSettings webSettings = mWebView.getSettings();
        webSettings.setUserAgentString(getMobileUserAgent());
        mWebView.reload();
    }

    private String getMobileUserAgent() {
        final String defaultUserAgent = mWebView.getSettings().getUserAgentString();
        final Matcher matcher = USER_AGENT_PATTERN.matcher(defaultUserAgent);
        final String userAgent;
        if (matcher.matches() && matcher.groupCount() >= 5) {
            userAgent = matcher.group(1) + matcher.group(2) + matcher.group(5);
        } else {
            userAgent = defaultUserAgent;
        }
        return userAgent;
    }

    // Weaker access suppressed, this class can not be private because of the obtainMessage(...)
    // call in the LightningViewTouchHandler
    static class WebViewHandler extends Handler {

        private WeakReference<LightningView> mReference;
        WebViewHandler(LightningView view) {
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

    void addItemToHistory(@Nullable final String title, @NonNull final String url) {
        if (!url.startsWith(Constants.FILE)) {
            LightningView.this.historyId = historyDatabase.visitHistoryItem(url, title);
        }
    }

    void updateHistoryItemTitle(@NonNull final String title) {
        if (historyId < 0) {
            return;
        }
        historyDatabase.updateTitleFor(historyId, title);
    }

    public void setListener(LightingViewListener lightingViewListenerListener) {
        this.lightingViewListenerListener = lightingViewListenerListener;
    }

    public boolean isUrlWhiteListed(){
        final Uri uri = Uri.parse(getUrl());
        final String host = uri.getHost();
        return attrack.isWhitelisted(host);
    }
}
