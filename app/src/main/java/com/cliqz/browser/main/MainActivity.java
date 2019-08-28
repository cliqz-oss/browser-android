package com.cliqz.browser.main;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.ActivityManager;
import android.app.ActivityManager.RunningAppProcessInfo;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.ProgressDialog;
import android.app.SearchManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Patterns;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.VisibleForTesting;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.anthonycr.grant.PermissionsManager;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.abtesting.ABTestFetcher;
import com.cliqz.browser.app.ActivityComponentProvider;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.extensions.ContextExtensionKt;
import com.cliqz.browser.gcm.RegistrationIntentService;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.peercomm.PeerCommunicationService;
import com.cliqz.browser.purchases.PurchaseFragment;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.reactnative.ReactMessages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.DownloadHelper;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.vpn.VpnPanel;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.cliqz.utils.ActivityUtils;
import com.cliqz.utils.StringUtils;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.util.HashSet;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.utils.WebUtils;
import acr.browser.lightning.view.LightningView;
import timber.log.Timber;

import static android.Manifest.permission.WRITE_EXTERNAL_STORAGE;
import static android.content.pm.PackageManager.PERMISSION_GRANTED;

/**
 * Flat navigation browser
 */
public class MainActivity extends AppCompatActivity implements ActivityComponentProvider {

    //Keys for arguments in intents/bundles
    private final static String TAG = MainActivity.class.getSimpleName();
    public static final String ACTION_DOWNLOAD = TAG + ".action_download";
    public static final String EXTRA_FILENAME = TAG + ".extra_filename";
    public static final String EXTRA_IS_PRIVATE = TAG + ".extra_is_private";
    public static final String EXTRA_TITLE = TAG + ".extra_title";

    private static final String OVERVIEW_FRAGMENT_TAG = "overview_fragment";
    protected static final String TAB_FRAGMENT_TAG = "tab_fragment";
    private static final String WEBVIEW_PACKAGE_NAME = "com.google.android.webview";
    public static final int FILE_UPLOAD_REQUEST_CODE = 1000;

    private static final String DIALOG_TAG = "dialog";

    private FlavoredActivityComponent mMainActivityComponent;


    private TabsManager.Builder firstTabBuilder;
    private OverviewFragment mOverViewFragment;
    private CustomViewHandler mCustomViewHandler;
    protected String currentMode;
    private boolean mIsColdStart = true;
    private final FileChooserHelper fileChooserHelper = new FileChooserHelper(this);
    private BroadcastReceiver mDownoloadCompletedBroadcastReceiver = null;

    private PurchaseFragment purchaseFragment;

    private boolean isIncognito = false;
    private String url = null;
    private String query = null;
    private boolean isRestored = false;

    @Inject
    CrashDetector crashDetector;

    @Inject
    Bus bus;

    @Inject
    TabsManager tabsManager;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    LocationCache locationCache;

    @Inject
    Timings timings;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    GCMRegistrationBroadcastReceiver gcmReceiver;

    @Inject
    SearchView searchView;

    @Inject
    OnBoardingHelper onBoardingHelper;

    @Inject
    Engine engine;

    @Inject
    PurchasesManager purchasesManager;

    private CliqzShortcutsHelper mCliqzShortcutsHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Task description
        ActivityUtils.setTaskDescription(this, R.string.app_name, R.color.primary_color_dark,
                R.mipmap.ic_launcher);

        mMainActivityComponent = BrowserApp.createActivityComponent(this);
        mMainActivityComponent.inject(this);
        if (BuildConfig.IS_LUMEN) {
            purchasesManager.checkPurchases();
        }
        bus.register(this);
        crashDetector.notifyOnCreate();

        TabsManager.RestoreTabsTask restoreTabsTask = new TabsManager.RestoreTabsTask(tabsManager.persister, bus);
        restoreTabsTask.execute();

        new ABTestFetcher().fetchTestList();
        mOverViewFragment = new OverviewFragment();
        // Ignore intent if we are being recreated
        final Intent intent = savedInstanceState == null ? getIntent() : null;
        final boolean isNotificationClicked;
        if (intent != null) {
            if (intent.getDataString() != null && intent.getDataString().equals("cliqz://NEWS_SHORTCUT_INTENT")) {
                isNotificationClicked = false;
                isIncognito = false;
                url = null;
                query = null;
                final ProgressDialog progressDialog = new ProgressDialog(this);
                progressDialog.setIndeterminate(true);
                progressDialog.show();
                // TODO This break the news on Cliqz. Please, move the loader to the proper, flavor dependent spot
                // new NewsFetcher(this).execute(NewsFetcher.getTopNewsUrl(preferenceManager, 1, locationCache));
            } else if (intent.getDataString() != null && intent.getDataString().equals("cliqz://LAST_SITE_SHORTCUT_INTENT")) {
                isNotificationClicked = false;
                isIncognito = false;
                url = null;
                query = null;
                JSONArray jsonArray = historyDatabase.getHistoryItems(0, 1);
                try {
                    final String lastSiteUrl = ((JSONObject)jsonArray.get(0)).optString("url");
                    if (lastSiteUrl == null || lastSiteUrl.isEmpty()) {
                        Toast.makeText(this, R.string.empty_history, Toast.LENGTH_SHORT).show();
                    } else {
                        tabsManager.buildTab().setUrl(lastSiteUrl).show();
                        isRestored = true;
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }else {
                final Bundle bundle = intent.getExtras();
                isIncognito = bundle != null && bundle.getBoolean(EXTRA_IS_PRIVATE);
                url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
                query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
                isNotificationClicked = bundle != null && bundle.getBoolean(Constants.NOTIFICATION_CLICKED);
            }
        } else {
            url = null;
            query = null;
            isNotificationClicked = false;
            isIncognito = false;
        }
        if (isNotificationClicked) {
            sendNotificationClickedTelemetry(intent);
        }

        setupContentView();

        if (preferenceManager.getSessionId() == null) {
            preferenceManager.setSessionId(telemetry.generateSessionID());
        }

        // Telemetry (were we updated?)
        final int currentVersionCode = BuildConfig.VERSION_CODE;
        final int previousVersionCode = preferenceManager.getVersionCode();
        if (previousVersionCode == 0) {
            preferenceManager.setVersionCode(BuildConfig.VERSION_CODE);
        } else if (currentVersionCode > previousVersionCode) {
            preferenceManager.setVersionCode(currentVersionCode);
            telemetry.sendLifeCycleSignal(TelemetryKeys.UPDATE);
        }

        if (checkPlayServices() && isImportantEnough()) {
            final Intent registrationIntent = new Intent(this, RegistrationIntentService.class);
            startService(registrationIntent);
        }

        if (shouldUpdateWebview()) {
            final AlertDialog.Builder builder = new AlertDialog.Builder(this);
            builder.setMessage(R.string.update_webview_msg)
                    .setCancelable(false)
                    .setPositiveButton(R.string.update, (dialog, id) -> {
                        startActivity(new Intent(Intent.ACTION_VIEW,
                                Uri.parse("market://details?id=" + WEBVIEW_PACKAGE_NAME)));
                        finish();
                    });
            AlertDialog alert = builder.create();
            alert.show();
        }

        Utils.updateUserLocation(preferenceManager);

        // Finally start the PeerCommunicationService
        PeerCommunicationService.startPeerCommunication(this);
        telemetry.sendOrientationSignal(getResources().getConfiguration().orientation ==
                Configuration.ORIENTATION_LANDSCAPE ? TelemetryKeys.LANDSCAPE : TelemetryKeys.PORTRAIT,
                TelemetryKeys.HOME);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            mCliqzShortcutsHelper = new CliqzShortcutsHelper(this, historyDatabase);
        }
        if (mIsColdStart) {
            final int startsCount = preferenceManager.getStartsCount();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && startsCount == 3) {
                MakeDefaultBrowserDialog.show(this);
            }
            telemetry.sendStartingSignals("cards", "cold");
        }
        if (getIntent() != null) {
            final String action = getIntent().getAction();
            if (action != null && action.equals(VpnPanel.ACTION_DISCONNECT_VPN)) {
                showVpnPanel();
            }
        }
    }

    private void showVpnPanel() {
        tabsManager.buildTab().setOpenVpnPanel().show();
    }

    // Workaround for a bug in Android 9 (Pie) as reported here
    // https://issuetracker.google.com/issues/113122354
    private boolean isImportantEnough() {
        if (Build.VERSION.SDK_INT != Build.VERSION_CODES.P) {
            return true;
        }
        final ActivityManager am = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        final List<RunningAppProcessInfo> list = am.getRunningAppProcesses();
        if (list == null || list.size() < 1) {
            return false;
        }
        return list.get(0).importance <= RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
    }

    private void sendNotificationClickedTelemetry(Intent intent) {
        final String rawType = intent.getStringExtra(Constants.NOTIFICATION_TYPE);
        final String type = rawType != null ? rawType : "unknown";
        telemetry.sendNotificationSignal(TelemetryKeys.CLICK, type, false);
    }

    // Please, return a TabsManager.Builder if your action as to display a new tab. null otherwise
    private TabsManager.Builder handleIntent(Intent intent) {
        if (intent == null) {
            return null;
        }

        final String action = intent.getAction();
        final TabsManager.Builder builder;
        if (Intent.ACTION_VIEW.equals(action)) {
            final boolean isIncognito = intent.getBooleanExtra(EXTRA_IS_PRIVATE, false);
            final String url = intent.getDataString();
            final String intentTitle = intent.getStringExtra(EXTRA_TITLE);
            final String title = intentTitle != null ? intentTitle : url;
            final boolean isNotificationClicked =
                    intent.getBooleanExtra(Constants.NOTIFICATION_CLICKED, false);
            if (isNotificationClicked) {
                sendNotificationClickedTelemetry(intent);
            }
            if (url == null) {
                return null;
            }
            builder = tabsManager.buildTab();
            builder.setForgetMode(isIncognito).setTitle(title).setUrl(url);
        } else if (Intent.ACTION_WEB_SEARCH.equals(action)) {
            final String query = intent.getStringExtra(SearchManager.QUERY);
            builder = tabsManager.buildTab();
            builder.setQuery(query);
        } else if (ACTION_DOWNLOAD.equals(action)) {
            final String url = intent.getDataString();
            if (url != null && !url.isEmpty()) {
                final String filename = intent.getStringExtra(EXTRA_FILENAME);
                final DownloadHelper.DownloaderListener listener =
                        new MainActivityDownloadListner(this, url, filename);
                DownloadHelper.download(this, url, filename, null, listener);
            }
            builder = null;
        } else {
            builder = null;
        }
        // Always reset the intent at the end
        setIntent(null);
        return builder;
    }

    private void setupContentView() {
        setContentView(R.layout.activity_main);
        if (BuildConfig.IS_LUMEN && preferenceManager.shouldShowLumenOnboarding()) {
            final LayoutInflater inflater = (LayoutInflater) getSystemService(LAYOUT_INFLATER_SERVICE);
            final View onboardingView = inflater.inflate(R.layout.lumen_onboarding, null);
            final FrameLayout rootView = findViewById(R.id.content_frame);
            rootView.addView(onboardingView);
            final Button closeOnboarding = onboardingView.findViewById(R.id.lumen_onboarding_close_button);
            closeOnboarding.setOnClickListener(view -> {
                preferenceManager.setShouldShowLumenOnboarding(false);
                rootView.removeView(onboardingView);
            });
        }
        if (firstTabBuilder != null) {
            firstTabBuilder.show();
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        // Handle configuration changes
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT) {
            bus.post(new BrowserEvents.ShowToolBar());
        }
        // Just share the new configuration on the bus
        bus.post(newConfig);
    }

    @Override
    protected void onResumeFragments() {
        super.onResumeFragments();
        final String name = getCurrentVisibleFragmentName();
        if (!name.isEmpty() && !mIsColdStart) {
            telemetry.sendStartingSignals(name, "warm");
        }
        mIsColdStart = false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        gcmReceiver.register();
        crashDetector.notifyOnResume();
        mDownoloadCompletedBroadcastReceiver = new DownoloadCompletedBroadcastReceiver(this);
        registerReceiver(mDownoloadCompletedBroadcastReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        tabsManager.resumeAllTabs();

        timings.setAppStartTime();
        locationCache.start();
        if (engine.reactInstanceManager != null) {
            engine.reactInstanceManager.onHostResume(this);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        final String action = intent.getAction();
        if (Intent.ACTION_MAIN.equals(action)) {
            return;
        }
        final TabsManager.Builder builder = handleIntent(intent);
        if (builder != null) {
            builder.show();
        }
        if (action != null && action.equals(VpnPanel.ACTION_DISCONNECT_VPN)) {
            showVpnPanel();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        gcmReceiver.unregister();
        crashDetector.notifyOnPause();
        try {
            if (mDownoloadCompletedBroadcastReceiver != null) {
                unregisterReceiver(mDownoloadCompletedBroadcastReceiver);
            }
        } catch (IllegalArgumentException e) {
            // This happens on a lot of Samsung devices
            Timber.e(e, "Can't unregister broadcast receiver");
        } finally {
            mDownoloadCompletedBroadcastReceiver = null;
        }
        tabsManager.pauseAllTabs();
        String context = getCurrentVisibleFragmentName();
        timings.setAppStopTime();
        if (!context.isEmpty()) {
            telemetry.sendClosingSignals(TelemetryKeys.CLOSE, context);
        }
        locationCache.stop();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1) {
            mCliqzShortcutsHelper.updateShortcuts();
        }

        if (engine.reactInstanceManager != null) {
            engine.reactInstanceManager.onHostPause(this);
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        bus.unregister(this);
        String context = getCurrentVisibleFragmentName();
        if (!context.isEmpty()) {
            telemetry.sendClosingSignals(TelemetryKeys.KILL, context);
        }

        if (engine.reactInstanceManager != null) {
            engine.reactInstanceManager.onHostDestroy(this);
        }
    }

    private void performExitCleanUp() {
        if (preferenceManager.getClearCacheExit()) {
            WebUtils.clearCache(this);
        }
        if (preferenceManager.getClearHistoryExitEnabled()) {
            historyDatabase.clearHistory(false);
            preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.CLEAR_HISTORY);
            WebUtils.clearWebStorage(this);
            final File file = new File(getApplicationInfo().dataDir+"/app_webview", "historyManager-journal");
            if (file.exists()) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
            ContextExtensionKt.deleteCacheDir(getApplicationContext());
        }
        if (preferenceManager.getClearCookiesExitEnabled()) {
            WebUtils.clearCookies(this);
            final File file = new File(getApplicationInfo().dataDir+"/app_webview", "Cookies-journal");
            if (file.exists()) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }

        }
        if (preferenceManager.getCloseTabsExit()) {
            tabsManager.clearTabsData();
        }
    }

    @Override
    public void onBackPressed() {
        bus.post(new Messages.BackPressed());
    }

    @Subscribe
    public void openLinkInNewTab(BrowserEvents.OpenUrlInNewTab event) {
        createTab(event.url, event.isIncognito, event.showImmediately);
        bus.post(new Messages.UpdateTabCounter(tabsManager.getTabCount()));
        Utils.showSnackbar(this, getString(R.string.tab_created), getString(R.string.view), v -> tabsManager.showTab(tabsManager.getTabCount() - 1));
    }

    @Subscribe
    public void createWindow(BrowserEvents.CreateWindow event) {
        final int tabPosition = tabsManager.findTabFor(event.view);
        final TabFragment fromTab = tabPosition >= 0 ? tabsManager.getTab(tabPosition) : null;
        final TabsManager.Builder builder = tabsManager.buildTab();
        if (fromTab != null) {
            builder.setOriginTab(fromTab).setForgetMode(fromTab.state.isIncognito());
        }
        builder.setMessage(event.msg).show();
    }

    @Subscribe
    public void createNewTab(BrowserEvents.NewTab event) {
        createTab("", event.isIncognito, true);
    }

    @Subscribe
    public void closeWindow(BrowserEvents.CloseWindow event) {
        tabsManager.closeTab(event.lightningView);
    }

    @Subscribe
    public void showFileChooser(BrowserEvents.ShowFileChooser event) {
        fileChooserHelper.showFileChooser(event);
    }

    @Subscribe
    public void sendTabToDesctop(Messages.SentTabToDesktop event) {
        final TabFragment tabFragment = tabsManager.getCurrentTab();
        final LightningView lightningView = tabFragment != null ? tabFragment.mLightningView : null;
        if (lightningView == null) {
            return;
        }
        final String url = lightningView.getUrl();
        final String title = lightningView.getTitle();
        final boolean isIncognito = lightningView.isIncognitoTab();
        if (url.isEmpty()) {
            return;
        }
        SendTabHelper.sendTab(this, url, title, isIncognito);
    }

    @Subscribe
    public void showSnackBarMessage(BrowserEvents.ShowSnackBarMessage msg) {
        if (msg.message != null) {
            Utils.showSnackbar(this, msg.message);
        } else if (msg.stringRes > 0) {
            Utils.showSnackbar(this, msg.stringRes);
        }
    }

    private void createTab(String url, boolean isIncognito, boolean showImmediately) {
        final TabsManager.Builder builder = tabsManager.buildTab();
        builder.setForgetMode(isIncognito);
        if (url != null && Patterns.WEB_URL.matcher(url).matches()) {
            builder.setUrl(url);
        }
        if (showImmediately) {
            builder.show();
        } else {
            builder.create();
        }
    }

    @Subscribe
    public void showCustomView(BrowserEvents.ShowCustomView event) {
        if (mCustomViewHandler != null) {
            mCustomViewHandler.onHideCustomView();
        }
        mCustomViewHandler = new CustomViewHandler(this, event.view, event.callback);
        mCustomViewHandler.showCustomView();
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void hideCustomView(BrowserEvents.HideCustomView event) {
        if (mCustomViewHandler != null) {
            mCustomViewHandler.onHideCustomView();
            mCustomViewHandler = null;
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void goToOverView(Messages.GoToOverview event) {
        telemetry.resetBackNavigationVariables(-1);
        final FragmentManager fm = getSupportFragmentManager();
        final FragmentTransaction transaction = fm.beginTransaction();
        //workaround for getting the mode in hitroy fragment
        //noinspection ConstantConditions
        currentMode = tabsManager.getCurrentTab().getTelemetryView();
        transaction.replace(R.id.content_frame, mOverViewFragment, OVERVIEW_FRAGMENT_TAG)
                .addToBackStack(null)
                .commitAllowingStateLoss();
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void goToFavorites(Messages.GoToFavorites event) {
        if (BuildConfig.IS_NOT_LUMEN) {
            mOverViewFragment.setDisplayFavorites();
            goToOverView(null);
        }
    }

    @Subscribe
    public void gotToOffrz(Messages.GoToOffrz event) {
        mOverViewFragment.setDisplayOffrz();
        goToOverView(null);
    }

    @Subscribe
    public void goToHistory(Messages.GoToHistory event) {
        mOverViewFragment.setDisplayHistory();
        goToOverView(null);
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void goToSettings(Messages.GoToSettings event) {
        startActivity(new Intent(this, SettingsActivity.class));
    }

    @Subscribe
    public void onQueryNotified(final CliqzMessages.NotifyQuery event) {
        final FragmentManager fm = getSupportFragmentManager();
        fm.popBackStack();
        //noinspection ConstantConditions
        tabsManager.getCurrentTab().state.setQuery(event.query);
        if (event.query != null) {
            fm.addOnBackStackChangedListener(new FragmentManager.OnBackStackChangedListener() {
                @Override
                public void onBackStackChanged() {
                    fm.removeOnBackStackChangedListener(this);
                    tabsManager.getCurrentTab().searchQuery(event.query);
                }
            });
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void closeTab(BrowserEvents.CloseTab event) {
        if (tabsManager.getTabCount() > 1) {
            tabsManager.deleteTab(tabsManager.getCurrentTabPosition());
            final int currentPos = tabsManager.getCurrentTabPosition();
            if (currentPos != -1) {
                tabsManager.showTab(currentPos);
            }
        } else {
            finish();
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    void quit(Messages.Quit event) {
        performExitCleanUp();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    @Subscribe
    void sendTabError(CliqzMessages.NotifyTabError event) {
        SendTabErrorDialog.show(this, SendTabErrorTypes.GENERIC_ERROR);
    }

    @Subscribe
    void sendTabSuccess(CliqzMessages.NotifyTabSuccess event) {
        String message;
        try {
            message = getString(R.string.tab_send_success_msg, event.json.getString("name"));
        } catch (JSONException e) {
            message = getString(R.string.tab_send_success_msg, "UNKOWN");
            Timber.e(e);
        }
        bus.post(new BrowserEvents.ShowSnackBarMessage(message));
        telemetry.sendSendTabSuccessSignal();
    }

    @Subscribe
    void setAdjustPan(Messages.AdjustPan event) {
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);
    }

    @Subscribe
    void setAdjustResize(Messages.AdjustResize event) {
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    // returns screen that is visible
    private String getCurrentVisibleFragmentName() {
        final String name;
        final TabFragment currentTab = tabsManager.getCurrentTab();
        if (mOverViewFragment != null && mOverViewFragment.isVisible()) {
            name = "past";
        } else if (currentTab != null) {
            name = currentTab.state.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        } else {
            name = "cards";
        }
        return name;
    }

    /**
     * We check for Google Play Services availability, but we do not rely on them so much so we
     * do not show any error message if they are not installed.
     * See https://github.com/googlesamples/google-services/blob/master/android/gcm/app/src/main/java/gcm/play/android/samples/com/gcmquickstart/MainActivity.java
     */
    private boolean checkPlayServices() {
        GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
        int resultCode = apiAvailability.isGooglePlayServicesAvailable(this);
        return resultCode == ConnectionResult.SUCCESS;
    }

    @SuppressLint("ObsoleteSdkInt")
    private boolean shouldUpdateWebview() {
        //Only need to check for android 5 and 6
        if (BrowserApp.isTestInProgress() || Build.VERSION.SDK_INT >= Build.VERSION_CODES.N ||
                Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            return false;
        }
        final PackageManager packageManager = getPackageManager();
        try {
            final PackageInfo packageInfo = packageManager.getPackageInfo(WEBVIEW_PACKAGE_NAME, 0);
            final String versionName = packageInfo.versionName;
            final int versionNumber = Integer.parseInt(versionName.substring(0, 2));
            return versionNumber < BuildConfig.MINIMUM_WEBVIEW_VERSION;
        } catch (PackageManager.NameNotFoundException e) {
            Timber.e("Package Android System WebView is not found");
            return false;
        }
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        final int id = item.getItemId();
        if (id == android.R.id.home) {
            onBackPressed();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_UPLOAD_REQUEST_CODE) {
            if (resultCode != Activity.RESULT_OK) {
                fileChooserHelper.notifyResultCancel();
                return;
            }

            fileChooserHelper.notifyResultOk(data);
        } else if (requestCode == VpnPanel.VPN_LAUNCH_REQUEST_CODE  && resultCode == Activity.RESULT_OK) {
            bus.post(new Messages.OnVpnPermissionGranted());
        }
        else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        PermissionsManager.getInstance().notifyPermissionsChange(permissions, grantResults);
        if (requestCode == Constants.LOCATION_PERMISSION && grantResults.length > 0 &&
                grantResults[0] == PERMISSION_GRANTED) {
            if (!locationCache.isGPSEnabled()) {
                Toast.makeText(this, R.string.gps_permission, Toast.LENGTH_SHORT).show();
            }
        }
    }

    @Nullable
    @Override
    public FlavoredActivityComponent getActivityComponent() {
        return mMainActivityComponent;
    }

    @VisibleForTesting
    public HistoryDatabase getHistoryDatabase() {
        return historyDatabase;
    }

    @Subscribe
    void openTab(CliqzMessages.OpenTab event) {
        if (!event.isValid) {
            Timber.e("Invalid OpenTab event");
            return;
        }
        final Uri uri = Uri.parse(event.url);
        // Is the uri still null?
        if (uri == null) {
            Timber.e("Can't parse Url");
            return;
        }

        // we can only throw an intent here
        final Intent intent = new Intent(getApplicationContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setData(uri);
        intent.setAction(Intent.ACTION_VIEW);
        intent.putExtra(MainActivity.EXTRA_IS_PRIVATE, event.isIncognito);
        intent.putExtra(MainActivity.EXTRA_TITLE, event.title);

        getApplicationContext().startActivity(intent);
    }

    @Subscribe
    void downloadVideo(CliqzMessages.DownloadVideo data) {
        final JSONObject jsonObject = data.json;
        final String filename = jsonObject.optString("filename", null);
        final String rawUrl = jsonObject.optString("url", null);
        final String url = StringUtils.encodeURLProperly(rawUrl);
        final Context context = getApplicationContext();
        final ConnectivityManager connectivityManager =
                (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivityManager == null) {
            return;
        }
        final NetworkInfo activeNetwork = connectivityManager.getActiveNetworkInfo();
        if (activeNetwork.getType() != ConnectivityManager.TYPE_WIFI) {
            NoWiFiDialog.show(this, bus);
            return;
        }
        if (canDownloadInBackground(context) && url != null) {
            DownloadHelper.download(context, url, filename, null,
                    new DownloadHelper.DownloaderListener() {
                        @Override
                        public void onSuccess(String url) {
                            bus.post(new BrowserEvents
                                    .ShowSnackBarMessage(context
                                    .getString(R.string.download_started)));
                        }

                        @Override
                        public void onFailure(String url, DownloadHelper.Error error,
                                              Throwable throwable) {
                            final String title;
                            final String message;
                            switch (error) {
                                case MEDIA_NOT_MOUNTED:
                                    message = context.getString(R.string.download_sdcard_busy_dlg_msg);
                                    title = context.getString(R.string.download_sdcard_busy_dlg_title);
                                    break;
                                case MEDIA_NOT_AVAILABLE:
                                    message = context.getString(R.string.download_no_sdcard_dlg_msg);
                                    title = context.getString(R.string.download_no_sdcard_dlg_title);
                                    break;
                                default:
                                    message = context.getString(R.string.download_failed);
                                    title = context.getString(R.string.title_error);
                                    break;
                            }
                            final AlertDialog.Builder builder = new AlertDialog.Builder(context);
                            builder.setTitle(title)
                                    .setMessage(message)
                                    .setPositiveButton(R.string.action_ok, null)
                                    .show();
                        }
                    });
        } else {
            // We must show interface here, just start the browser
            final Intent intent = new Intent(context, MainActivity.class);
            intent.setAction(MainActivity.ACTION_DOWNLOAD);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.setData(Uri.parse(StringUtils.encodeURLProperly(rawUrl)));
            intent.putExtra(MainActivity.EXTRA_FILENAME, filename);
            context.startActivity(intent);
        }
    }

    @Subscribe
    void onReactCheckPermission(ReactMessages.CheckPermission event) {
        if (PermissionsManager.hasPermission(this, event.permission)) {
            event.promise.resolve(true);
        } else {
            event.promise.resolve(false);
        }
    }

    @Subscribe
    void onReactRequestPermission(ReactMessages.RequestPermission event) {
        PermissionsManager.getInstance()
                .requestPermissionsIfNecessaryForResult(this, event, event.permission);
    }

    private static boolean canDownloadInBackground(Context context) {
        final int result = ContextCompat
                .checkSelfPermission(context, WRITE_EXTERNAL_STORAGE);
        return result == PERMISSION_GRANTED;
    }

    @Subscribe
    public void restoreTabs(CliqzMessages.RestoreTabs restoreTabs) {
        if (crashDetector.hasCrashed() && !restoreTabs.storedTabs.isEmpty()) {
            ResumeTabDialog.show(this, restoreTabs.storedTabs);
            crashDetector.resetCrash();
            isRestored = false;
        } else {
            isRestored = tabsManager.restoreTabs(restoreTabs.storedTabs);
        }
        if (!isRestored || url != null || query != null) {
            firstTabBuilder = tabsManager.buildTab();
            firstTabBuilder.setForgetMode(isIncognito);
            if (url != null && Patterns.WEB_URL.matcher(url).matches()) {
                setIntent(null);
                firstTabBuilder.setUrl(url);
            } else if (query != null) {
                setIntent(null);
                firstTabBuilder.setQuery(query);
            }
            firstTabBuilder.show();
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void goToPurchase(Messages.GoToPurchase event) {
        // TODO @Jayesh: if event.trialDaysLeft > 0 display a toast else go to the fragment and remove the unused parameter suppression
        if (purchaseFragment == null) {
            purchaseFragment = new PurchaseFragment();
        }
        if (!isPurchaseFragmentVisible()) {
            purchaseFragment.show(getSupportFragmentManager(), DIALOG_TAG);
        }
    }

    private boolean isPurchaseFragmentVisible() {
        return purchaseFragment != null && purchaseFragment.isVisible();
    }
}
