package com.cliqz.browser.main;

import android.Manifest;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.SearchManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ActivityInfo;
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
import android.support.v4.view.ViewPager;
import android.support.v7.app.AppCompatActivity;
import android.util.Patterns;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.CheckBox;
import android.widget.CompoundButton;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.ActivityComponentProvider;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.di.modules.MainActivityModule;
import com.cliqz.browser.gcm.RegistrationIntentService;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.LookbackWrapper;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.Timings;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.SearchWebView;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import java.io.File;
import java.util.HashSet;

import javax.inject.Inject;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.ProxyUtils;
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

    private ActivityComponent mActivityComponent;

    private static final String OVERVIEW_FRAGMENT_TAG = "overview_fragment";
    static final String TAB_FRAGMENT_TAG = "tab_fragment";
    private static final String LOCATION_PERMISSION = Manifest.permission.ACCESS_FINE_LOCATION;

    private Bundle firstTabArgs;
    private OverviewFragment mOverViewFragment;
    private OnBoardingAdapter onBoardingAdapter;
    private ViewPager pager;
    private boolean askedGPSPermission = false;
    private CustomViewHandler mCustomViewHandler;
    protected SearchWebView searchWebView;
    protected String currentMode;
    private boolean mIsColdStart = true;
    private boolean mShouldShowLookbackDialog = true;
    private final HashSet<Long> downloadIds = new HashSet<>();

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
    ProxyUtils proxyUtils;

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
        performExitCleanUp();
        // Ignore intent if we are being recreated
        final Intent intent = savedInstanceState == null ? getIntent() : null;
        final String url;
        final boolean message;
        final String query;
        final boolean isNotificationClicked;
        final boolean isIncognito;
        if (intent != null) {
            final Bundle bundle = intent.getExtras();
            isIncognito = bundle != null ? bundle.getBoolean(Constants.KEY_IS_INCOGNITO) : false;
            message = BrowserApp.hasNewTabMessage();
            url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
            query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
            isNotificationClicked = bundle != null ? bundle.getBoolean(Constants.NOTIFICATION_CLICKED) : false;
        } else {
            url = null;
            message = false;
            query = null;
            isNotificationClicked = false;
            isIncognito = false;
        }
        if(isNotificationClicked) {
            telemetry.sendNewsNotificationSignal(Telemetry.Action.CLICK);
        }
        firstTabArgs = new Bundle();
        firstTabArgs.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        if (url != null && Patterns.WEB_URL.matcher(url).matches()) {
            setIntent(null);
            firstTabArgs.putString(Constants.KEY_URL, url);
        } else if (message) {
            setIntent(null);
            firstTabArgs.putBoolean(Constants.KEY_NEW_TAB_MESSAGE, true);
        } else if (query != null) {
            setIntent(null);
            firstTabArgs.putString(Constants.KEY_QUERY, query);
        }

        // File used to override the onboarding during UIAutomation tests
        final File onBoardingOverrideFile = new File(Constants.ONBOARDING_OVERRIDE_FILE);
        final boolean hasAProperOverrideOnBoardingFile =
                onBoardingOverrideFile.exists() &&
                onBoardingOverrideFile.length() > 0;
        final boolean hasBeenLaunchedWithNoOnboarding = intent != null &&
                intent.getBooleanExtra(Constants.KEY_DO_NOT_SHOW_ONBOARDING, false);
        final boolean shouldShowOnboarding = !preferenceManager.getOnBoardingComplete() &&
                !hasAProperOverrideOnBoardingFile && !hasBeenLaunchedWithNoOnboarding;
        if (shouldShowOnboarding) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            setContentView(R.layout.activity_on_boarding);
            onBoardingAdapter = new OnBoardingAdapter(getSupportFragmentManager(), telemetry);
            pager = (ViewPager) findViewById(R.id.viewpager);
            pager.setAdapter(onBoardingAdapter);
            pager.addOnPageChangeListener(onBoardingAdapter.onPageChangeListener);
        } else {
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
            telemetry.sendLifeCycleSignal(Telemetry.Action.UPDATE);
        }

        if (checkPlayServices()) {
            final Intent registrationIntent = new Intent(this, RegistrationIntentService.class);
            startService(registrationIntent);
        }
    }

    private void setupContentView() {
        //final MainViewContainer content = new MainViewContainer(this);
        //content.setFitsSystemWindows(true);
        //content.setBackgroundColor(Color.WHITE);
        //final LayoutParams params = new LayoutParams(MATCH_PARENT, MATCH_PARENT);
        //content.setId(CONTENT_VIEW_ID);
        //setContentView(content, params);
        setContentView(R.layout.activity_main);
        tabsManager.addNewTab(firstTabArgs);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        // Handle configuration changes
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_PORTRAIT) {
            bus.post(new BrowserEvents.ShowToolBar());
        }
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
                    && preferenceManager.getOnBoardingComplete()
                    && !askedGPSPermission
                    && checkSelfPermission(LOCATION_PERMISSION) != PackageManager.PERMISSION_GRANTED) {
                askedGPSPermission = true;
                final String[] permissions = {LOCATION_PERMISSION}; //Array of permissions needed
                final int requestCode = 1; //Used to identify the request in the callback onRequestPermissionsResult(Not used)
                requestPermissions(permissions, requestCode);
            }
        }
        //The idea is to reset all tabs if the app has been in background for 30mins
        for (TabFragment tabFragment : tabsManager.getTabsList()) {
            tabFragment.state.setShouldReset(
                    System.currentTimeMillis() - timings.getAppStopTime() >= Constants.HOME_RESET_DELAY);
        }
        if (preferenceManager.getLocationEnabled()) {
            locationCache.start();
        } else {
            locationCache.stop();
        }

        proxyUtils.updateProxySettings(this);

        //Asks for permission if GPS is not enabled on the device.
        // Note: Will ask for permission even if location is enabled, but not using GPS
        if(!locationCache.isGPSEnabled()
                && !preferenceManager.getNeverAskGPSPermission()
                && preferenceManager.getOnBoardingComplete()
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
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, false);
        if(url != null && Patterns.WEB_URL.matcher(url).matches()) {
            args.putString(Constants.KEY_URL, url);
        }
        if (query != null) {
            args.putString(Constants.KEY_QUERY, query);
        }
        if(isNotificationClicked) {
            telemetry.sendNewsNotificationSignal(Telemetry.Action.CLICK);
        }
        tabsManager.addNewTab(args);
        telemetry.sendNewTabSignal(tabsManager.getTabCount(), false);
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
                        })
                .setOnDismissListener(new DialogInterface.OnDismissListener() {
                    @Override
                    public void onDismiss(DialogInterface dialog) {
                        showLookbackDialog();
                    }
                });
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
        gcmReceiver.unregister();
        unregisterReceiver(onComplete);
        tabsManager.pauseAllTabs();
        String context = getCurrentVisibleFragmentName();
        timings.setAppStopTime();
        if(!context.isEmpty()) {
            telemetry.sendClosingSignals(Telemetry.Action.CLOSE, context);
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
            telemetry.sendClosingSignals(Telemetry.Action.KILL, context);
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
        createTab(event.url, event.isIncognito);
    }

    @Subscribe
    public void createWindow(BrowserEvents.CreateWindow event) {
        createTab(event.msg, tabsManager.getCurrentTab().state.isIncognito());
//        // TODO: Temporary workaround, we want to open a new activity!
//        bus.post(new CliqzMessages.OpenLink(event.url));
    }

    @Subscribe
    public void createNewTab(BrowserEvents.NewTab event) {
        createTab("", event.isIncognito);
    }

    private void createTab(Message msg, boolean isIncognito) {
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        args.putBoolean(Constants.KEY_NEW_TAB_MESSAGE, true);
        BrowserApp.pushNewTabMessage(msg);
        tabsManager.addNewTab(args);
        telemetry.sendNewTabSignal(tabsManager.getTabCount(), isIncognito);
    }

    private void createTab(String url, boolean isIncognito) {
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        if(url != null && Patterns.WEB_URL.matcher(url).matches()) {
            args.putString(Constants.KEY_URL, url);
        }
        tabsManager.addNewTab(args);
        telemetry.sendNewTabSignal(tabsManager.getTabCount(), isIncognito);
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
    public void exit(Messages.Exit event) {
        if (tabsManager.getTabCount() > 1) {
            tabsManager.deleteTab(tabsManager.getCurrentTabPosition());
            final int currentPos = tabsManager.getCurrentTabPosition();
            if (currentPos != -1) {
                tabsManager.showTab(tabsManager.getCurrentTabPosition());
            }
        } else {
            finish();
        }
    }

    public void nextScreen(View view) {
        final int page = pager.getCurrentItem() + 1;
        pager.setCurrentItem(page);
    }

    public void onBoardingDone(View view) {
        ((ViewGroup)(view.getParent())).removeAllViews();
        preferenceManager.setOnBoardingComplete(true);
        long curTime = System.currentTimeMillis();
        telemetry.sendOnBoardingHideSignal(curTime - onBoardingAdapter.startTime);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_FULL_USER);
        // Send telemetry "installed" signal
        // telemetry.sendLifeCycleSignal(Telemetry.Action.INSTALL);
        setupContentView();
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

    @Nullable
    @Override
    public ActivityComponent getActivityComponent() {
        return mActivityComponent;
    }
}
