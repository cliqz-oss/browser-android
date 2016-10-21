package com.cliqz.browser.main;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.SearchManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.support.annotation.Nullable;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentTransaction;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AppCompatActivity;
import android.util.Patterns;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.WindowManager;
import android.widget.CheckBox;
import android.widget.CompoundButton;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.ActivityComponentProvider;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.di.modules.MainActivityModule;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.LookbackWrapper;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.TelemetryKeys;
import com.cliqz.browser.utils.Timings;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.SearchWebView;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import java.util.HashSet;
import java.util.concurrent.Callable;

import javax.inject.Inject;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.utils.WebUtils;

/**
 * Flat navigation browser
 *
 * @author Stefano Pacifici
 * @date 2015/11/23
 */
public class MainActivity extends AppCompatActivity implements ActivityComponentProvider {

    private final static String TAG = MainActivity.class.getSimpleName();
    private static final int PLAY_SERVICES_RESOLUTION_REQUEST = 9000;

    public static final int FILE_UPLOAD_REQUEST_CODE = 1000;

    private ActivityComponent mActivityComponent;

    private static final String OVERVIEW_FRAGMENT_TAG = "overview_fragment";
    static final String TAB_FRAGMENT_TAG = "tab_fragment";
    private static final String LOCATION_PERMISSION = Manifest.permission.ACCESS_FINE_LOCATION;

    private TabsManager.Builder firstTabBuilder;
    private OverviewFragment mOverViewFragment;
    private boolean askedGPSPermission = false;
    private CustomViewHandler mCustomViewHandler;
    protected SearchWebView searchWebView;
    protected String currentMode;
    private boolean mIsColdStart = true;
    private boolean mShouldShowLookbackDialog = true;
    private final HashSet<Long> downloadIds = new HashSet<>();
    private final FileChooserHelper fileChooserHelper = new FileChooserHelper(this);

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

    // Removed as version 1.0.2r2
    // @Inject
    // ProxyUtils proxyUtils;

    @Inject
    OnBoardingHelper onBoardingHelper;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mActivityComponent = BrowserApp.getAppComponent().plus(new MainActivityModule(this));
        mActivityComponent.inject(this);
        bus.register(this);
        // TODO reintroduce savedInstanceState logic
//        Restore state
//        final CliqzBrowserState oldState = savedInstanceState != null ?
//                (CliqzBrowserState) savedInstanceState.getSerializable(SAVED_STATE) :
//                null;
//        mBrowserState = oldState != null ? oldState : new CliqzBrowserState();
        // Translucent status bar only on selected platforms
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
//            final Window window = getWindow();
//            window.setFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS,
//                    WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
//        }

//        mFreshTabFragment = new FreshTabFragment();
        searchWebView = new SearchWebView(this);
        searchWebView.setBackgroundColor(ContextCompat.getColor(this, R.color.normal_tab_primary_color));
        mOverViewFragment = new OverviewFragment();
        // Ignore intent if we are being recreated
        final Intent intent = savedInstanceState == null ? getIntent() : null;
        final String url;
        final String query;
        final boolean isNotificationClicked;
        final boolean isIncognito;
        if (intent != null) {
            final Bundle bundle = intent.getExtras();
            isIncognito = bundle != null ? bundle.getBoolean(Constants.KEY_IS_INCOGNITO) : false;
            url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
            query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
            isNotificationClicked = bundle != null ? bundle.getBoolean(Constants.NOTIFICATION_CLICKED) : false;
        } else {
            url = null;
            query = null;
            isNotificationClicked = false;
            isIncognito = false;
        }
        if(isNotificationClicked) {
            telemetry.sendNewsNotificationSignal(TelemetryKeys.CLICK);
        }
        firstTabBuilder = tabsManager.buildTab();
        firstTabBuilder.setForgetMode(isIncognito);
        if (url != null && Patterns.WEB_URL.matcher(url).matches()) {
            setIntent(null);
            firstTabBuilder.setUrl(url);
        } else if (query != null) {
            setIntent(null);
            firstTabBuilder.setQuery(query);
        }

        final boolean onBoardingShown =
                onBoardingHelper.conditionallyShowOnBoarding(new Callable<Void>() {
                    final long startTime = System.currentTimeMillis();

                    @Override
                    public Void call() throws Exception {
                        final long now = System.currentTimeMillis();
                        telemetry.sendOnBoardingHideSignal(now - startTime);
                        setupContentView();
                        return null;
                    }
                });

        if (!onBoardingShown) {
            setupContentView();
        }

        if (preferenceManager.getSessionId() == null) {
            preferenceManager.setSessionId(telemetry.generateSessionID());
        }

        // Telemetry (were we updated?)
        final int currentVersionCode = BuildConfig.VERSION_CODE;
        final int previousVersionCode = preferenceManager.getVersionCode();
        if (previousVersionCode == 0) {
            preferenceManager.setVersionCode(BuildConfig.VERSION_CODE);
        } else if(currentVersionCode > previousVersionCode) {
            preferenceManager.setVersionCode(currentVersionCode);
            telemetry.sendLifeCycleSignal(TelemetryKeys.UPDATE);
        }
    }

    private void setupContentView() {
        setContentView(R.layout.activity_main);
        firstTabBuilder.show();
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
        if(!name.isEmpty() && !mIsColdStart) {
            telemetry.sendStartingSignals(name, "warm");
        }
        mIsColdStart = false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        gcmReceiver.register();
        registerReceiver(onComplete, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        tabsManager.resumeAllTabs();
        final String name = getCurrentVisibleFragmentName();
        timings.setAppStartTime();
        //Ask for "Dangerous Permissions" on runtime
        if(Build.VERSION.SDK_INT > Build.VERSION_CODES.LOLLIPOP_MR1) {
            if(preferenceManager.getLocationEnabled()
                    && onBoardingHelper.isOnboardingCompleted()
                    && !askedGPSPermission
                    && checkSelfPermission(LOCATION_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
                askedGPSPermission = true;
                final String[] permissions = {LOCATION_PERMISSION}; //Array of permissions needed
                final int requestCode = 1; //Used to identify the request in the callback onRequestPermissionsResult(Not used)
                requestPermissions(permissions, requestCode);
            }
        }
        //The idea is to reset all tabs if the app has been in background for 30mins
        tabsManager.setShouldReset(
                System.currentTimeMillis() - timings.getAppStopTime() >= Constants.HOME_RESET_DELAY);
        if (preferenceManager.getLocationEnabled()) {
            locationCache.start();
        } else {
            locationCache.stop();
        }

        // Removed as version 1.0.2r2
        // proxyUtils.updateProxySettings(this);

        //Asks for permission if GPS is not enabled on the device.
        // Note: Will ask for permission even if location is enabled, but not using GPS
        if(!locationCache.isGPSEnabled()
                && !preferenceManager.getNeverAskGPSPermission()
                && onBoardingHelper.isOnboardingCompleted()
                && preferenceManager.getLocationEnabled()
                && !askedGPSPermission) {
            askedGPSPermission = true;
            showGPSPermissionDialog();
        } else {
            showLookbackDialog();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (Intent.ACTION_MAIN.equals(intent.getAction())) {
            return;
        }
        final Bundle bundle = intent.getExtras();
        final String url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
        final String query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
        final boolean isNotificationClicked = bundle != null ? bundle.getBoolean(Constants.NOTIFICATION_CLICKED) : false;
        final TabsManager.Builder builder = tabsManager.buildTab();
        if(url != null && Patterns.WEB_URL.matcher(url).matches()) {
            builder.setUrl(url);
        }
        builder.setQuery(query);
        if(isNotificationClicked) {
            telemetry.sendNewsNotificationSignal(TelemetryKeys.CLICK);
        }
        builder.show();
    }

    private void showGPSPermissionDialog() {
        final LayoutInflater inflater = LayoutInflater.from(this);
        final View dialogLayout = inflater.inflate(R.layout.dialog_gps_permission, null);
        final CheckBox dontShowAgain = (CheckBox) dialogLayout.findViewById(R.id.skip);
        final AlertDialog.Builder builder = new AlertDialog.Builder(this);
        final String action = Settings.ACTION_LOCATION_SOURCE_SETTINGS;
        final String message = getResources().getString(R.string.gps_permission);
        builder.setView(dialogLayout);
        builder.setMessage(message)
                .setPositiveButton("OK",
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                startActivity(new Intent(action));
                                dialog.dismiss();
                            }
                        })
                .setNegativeButton("Cancel",
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int which) {
                                dialog.dismiss();
                            }
                        });

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            builder.setOnDismissListener(new DialogInterface.OnDismissListener() {
                @Override
                public void onDismiss(DialogInterface dialog) {
                    showLookbackDialog();
                }
            });
        }
        builder.create().show();
        dontShowAgain.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
                preferenceManager.setNeverAskGPSPermission(isChecked);
            }
        });
    }

    private void showLookbackDialog() {
        if ("lookback".contentEquals(BuildConfig.FLAVOR_api) && mShouldShowLookbackDialog) {
            mShouldShowLookbackDialog = false;
            LookbackWrapper.show(this, preferenceManager.getSessionId());
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        performExitCleanUp();
        gcmReceiver.unregister();
        unregisterReceiver(onComplete);
        tabsManager.pauseAllTabs();
        String context = getCurrentVisibleFragmentName();
        timings.setAppStopTime();
        if(!context.isEmpty()) {
            telemetry.sendClosingSignals(TelemetryKeys.CLOSE, context);
        }
        locationCache.stop();
    }

    //TODO Reintroduce this
//    @Override
//    protected void onSaveInstanceState(Bundle outState) {
//        outState.putSerializable(SAVED_STATE, mBrowserState);
//        super.onSaveInstanceState(outState);
//    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        bus.unregister(this);
        String context = getCurrentVisibleFragmentName();
        if(!context.isEmpty()) {
            telemetry.sendClosingSignals(TelemetryKeys.KILL, context);
        }
    }

    private void performExitCleanUp() {
        if (preferenceManager.getClearCacheExit()) {
            WebUtils.clearCache(this);
        }
        if (preferenceManager.getClearHistoryExitEnabled()) {
            historyDatabase.clearHistory(false);
            preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.CLEAR_HISTORY);
        }
        if (preferenceManager.getClearCookiesExitEnabled()) {
            WebUtils.clearCookies(this);
        }
    }

    @Override
    public void onBackPressed() {
        bus.post(new Messages.BackPressed());
    }

    @Subscribe
    public void openLinkInNewTab(BrowserEvents.OpenUrlInNewTab event) {
        createTab(event.url, event.isIncognito, false);
        bus.post(new Messages.UpdateTabCounter(tabsManager.getTabCount()));
        Utils.showSnackbar(this, getString(R.string.tab_created), getString(R.string.view), new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                tabsManager.showTab(tabsManager.getTabCount() - 1);
            }
        });
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

    private void createTab(Message msg, boolean isIncognito) {
        tabsManager.buildTab().setForgetMode(isIncognito).setMessage(msg).show();
    }

    private void createTab(String url, boolean isIncognito, boolean showImmediately) {
        final TabsManager.Builder builder = tabsManager.buildTab();
        builder.setForgetMode(isIncognito);
        if(url != null && Patterns.WEB_URL.matcher(url).matches()) {
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

    @Subscribe
    public void hideCustomView(BrowserEvents.HideCustomView event) {
        if (mCustomViewHandler != null) {
            mCustomViewHandler.onHideCustomView();
            mCustomViewHandler = null;
        }
    }
    @Subscribe
    public void goToOverView(Messages.GoToOverview event) {
        telemetry.resetBackNavigationVariables(-1);
        final FragmentManager fm = getSupportFragmentManager();
        final FragmentTransaction transaction = fm.beginTransaction();
        //workaround for getting the mode in hitroy fragment
        currentMode = tabsManager.getCurrentTab()
                .state.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        transaction.replace(R.id.content_frame, mOverViewFragment, OVERVIEW_FRAGMENT_TAG)
                .addToBackStack(null)
                .commit();
    }

    @Subscribe
    public void goToSettings(Messages.GoToSettings event) {
        startActivity(new Intent(this, SettingsActivity.class));
    }

//    @Subscribe
//    public void goToSearch(Messages.GoToSearch event) {
    @Subscribe
    public void onQueryNotified(final CliqzMessages.NotifyQuery event) {
        final FragmentManager fm = getSupportFragmentManager();
        fm.popBackStack();
        final String query = event.query;
        tabsManager.getCurrentTab().state.setQuery(event.query);
        if (event.query != null) {
            fm.addOnBackStackChangedListener(new FragmentManager.OnBackStackChangedListener() {
                @Override
                public void onBackStackChanged() {
                    fm.removeOnBackStackChangedListener(this);
                    tabsManager.getCurrentTab().searchQuery(event.query);
//                    bus.post(new CliqzMessages.NotifyQuery(query));
                }
            });
        }
    }

    @Subscribe
    public void setAdjustPan(Messages.AdjustPan event) {
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN);
    }

    @Subscribe
    public void setAdjustResize(Messages.AdjustResize event) {
        getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    }

    @Subscribe
    public void saveDownloadId(Messages.SaveId event) {
        downloadIds.add(event.downloadId);
    }

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

    @Subscribe
    public void quit(Messages.Quit event) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    // returns screen that is visible
    private String getCurrentVisibleFragmentName() {
        String name = "";
        final TabFragment currentTab = tabsManager.getCurrentTab();
        if (mOverViewFragment != null && mOverViewFragment.isVisible()) {
            name = "past";
        } else if (currentTab != null){
            name = currentTab.state.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        } else {
            name = "cards";
        }
        return name;
    }

    private final BroadcastReceiver onComplete = new BroadcastReceiver() {
        public void onReceive(Context ctxt, final Intent intent) {
            final long downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            final boolean isYouTubeVideo = downloadIds.contains(downloadId);
            if (isYouTubeVideo) {
                downloadIds.remove(downloadId);
            }
            final DownloadManager downloadManager = (DownloadManager)
                    getSystemService(Context.DOWNLOAD_SERVICE);
            final DownloadManager.Query query = new DownloadManager.Query();
            query.setFilterById(downloadId);
            final Cursor cursor = downloadManager.query(query);
            final int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            final int localUriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
            final int mediaTypeIndex = cursor.getColumnIndex(DownloadManager.COLUMN_MEDIA_TYPE);
            if (cursor.moveToFirst()) {
                if (cursor.getInt(statusIndex) == DownloadManager.STATUS_SUCCESSFUL) {
                    if (isYouTubeVideo) {
                        telemetry.sendVideoDownloadedSignal(true);
                    }
                    final View.OnClickListener onClickListener = new View.OnClickListener() {
                        @Override
                        public void onClick(View v) {
                            final Intent intent = new Intent();
                            intent.setAction(Intent.ACTION_VIEW);
                            intent.setDataAndType(Uri.parse(cursor.getString(localUriIndex)),
                                    cursor.getString(mediaTypeIndex));
                            startActivity(intent);
                        }
                    };
                    Utils.showSnackbar(MainActivity.this, getString(R.string.download_successful),
                            getString(R.string.action_open), onClickListener);
                } else if (cursor.getInt(statusIndex) == DownloadManager.STATUS_FAILED) {
                    if (isYouTubeVideo) {
                        telemetry.sendVideoDownloadedSignal(false);
                    }
                    Utils.showSnackbar(MainActivity.this, getString(R.string.download_failed));
                }
            }
        }
    };

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        final int id = item.getItemId();
        switch(id) {
            case android.R.id.home:
                onBackPressed();
                return true;
            default:
                return super.onOptionsItemSelected(item);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_UPLOAD_REQUEST_CODE) {
            if (resultCode != Activity.RESULT_OK) {
                fileChooserHelper.notifyResultCancel();
                return;
            }

            fileChooserHelper.notifyResultOk(data);
        } else {
            super.onActivityResult(requestCode, resultCode, data);
        }
    }

    @Nullable
    @Override
    public ActivityComponent getActivityComponent() {
        return mActivityComponent;
    }
}
