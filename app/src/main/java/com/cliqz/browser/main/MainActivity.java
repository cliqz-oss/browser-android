package com.cliqz.browser.main;

import android.Manifest;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.SearchManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentTransaction;
import android.support.v4.content.ContextCompat;
import android.support.v4.view.ViewCompat;
import android.support.v4.view.ViewPager;
import android.support.v4.widget.DrawerLayout;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.util.Patterns;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.CheckBox;
import android.widget.CompoundButton;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.di.modules.MainActivityModule;
import com.cliqz.browser.gcm.RegistrationIntentService;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.Timings;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.SearchWebView;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.WebUtils;

/**
 * Flat navigation browser
 *
 * @author Stefano Pacifici
 * @date 2015/11/23
 */
public class MainActivity extends AppCompatActivity {

    private final static String TAG = MainActivity.class.getSimpleName();
    private static final int PLAY_SERVICES_RESOLUTION_REQUEST = 9000;

    private static final String NEW_TAB_MSG = "new_tab_message_extra";

    public ActivityComponent mActivityComponent;

    private static final String HISTORY_FRAGMENT_TAG = "history_fragment";
    private static final String SUGGESTIONS_FRAGMENT_TAG = "suggestions_fragment";
    static final String SEARCH_FRAGMENT_TAG = "search_fragment";
    private static final String CUSTOM_VIEW_FRAGMENT_TAG = "custom_view_fragment";
    private static final String LOCATION_PERMISSION = Manifest.permission.ACCESS_FINE_LOCATION;

    private static final int CONTENT_VIEW_ID = R.id.main_activity_content;

    private static final String SAVED_STATE = TAG + ".SAVED_STATE";

    private TabFragment firstFragment;
    private FreshTabFragment mFreshTabFragment;
    private HistoryFragment mHistoryFragment;
    private OnBoardingAdapter onBoardingAdapter;
    private ViewPager pager;
    private boolean askedGPSPermission = false;
    private CustomViewHandler mCustomViewHandler;
    // private boolean mIsIncognito;
    private final List<TabFragment> mFragmentsList = new ArrayList<>();
    private RecyclerView mTabListView;
    protected TabsAdapter mTabsAdapter;
    private DrawerLayout drawerLayout;
    protected SearchWebView searchWebView;
    protected String currentMode;
    private boolean mIsColdStart = true;

    @Inject
    Bus bus;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    LocationCache locationCache;

    @Inject
    Timings timings;

    @Inject
    GCMRegistrationBroadcastReceiver gcmReceiver;

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
        mHistoryFragment = new HistoryFragment(this);
        firstFragment = new TabFragment();
        mFragmentsList.add(firstFragment);

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
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        if (url != null && Patterns.WEB_URL.matcher(url).matches()) {
            setIntent(null);
            args.putString(Constants.KEY_URL, url);
        } else if (message) {
            setIntent(null);
            args.putBoolean(Constants.KEY_NEW_TAB_MESSAGE, true);
        } else if (query != null) {
            setIntent(null);
            args.putString(Constants.KEY_QUERY, query);
        }
        firstFragment.setArguments(args);

        // File used to override the onboarding during UIAutomation tests
        final File onBoardingOverrideFile = new File(Constants.ONBOARDING_OVERRIDE_FILE);
        final boolean shouldOverrideOnBoarding =
                onBoardingOverrideFile.exists() &&
                onBoardingOverrideFile.length() > 0;
        if (preferenceManager.getOnBoardingComplete() || shouldOverrideOnBoarding) {
            setupContentView();
        } else {
            preferenceManager.setSessionId(telemetry.generateSessionID());
            preferenceManager.setVersionCode(BuildConfig.VERSION_CODE);
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
            setContentView(R.layout.activity_on_boarding);
            onBoardingAdapter = new OnBoardingAdapter(getSupportFragmentManager(), telemetry);
            pager = (ViewPager) findViewById(R.id.viewpager);
            pager.setAdapter(onBoardingAdapter);
            pager.addOnPageChangeListener(onBoardingAdapter.onPageChangeListener);
        }

        // Telemetry (were we updated?)
        int currentVersionCode = BuildConfig.VERSION_CODE;
        int previousVersionCode = preferenceManager.getVersionCode();
        if(currentVersionCode > previousVersionCode) {
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
        drawerLayout = (DrawerLayout) findViewById(R.id.drawer_layout);
        drawerLayout.setDrawerListener(new DrawerListener());
        mTabListView = (RecyclerView) findViewById(R.id.tabs_list);
        mTabsAdapter = new TabsAdapter(this, R.layout.tab_list_item, mFragmentsList);
        mTabListView.setAdapter(mTabsAdapter);
        final RecyclerView.LayoutManager layoutManager = new LinearLayoutManager(this, LinearLayoutManager.VERTICAL, false);
        mTabListView.setLayoutManager(layoutManager);
        mTabListView.setHasFixedSize(true);
        final FragmentManager fm = getSupportFragmentManager();
        fm.beginTransaction().add(R.id.content_frame, firstFragment, SEARCH_FRAGMENT_TAG).commit();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        // Handle configuration changes
        super.onConfigurationChanged(newConfig);
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
        resumeAllWebViews();
        final String name = getCurrentVisibleFragmentName();
        timings.setAppStartTime();
        if(!name.isEmpty()) {
            telemetry.sendStartingSignals(name, mIsColdStart ? "cold" : "warm");
        }
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
        for (TabFragment tabFragment : mFragmentsList) {
            tabFragment.state.setShouldReset(
                    System.currentTimeMillis() - timings.getAppStopTime() >= Constants.HOME_RESET_DELAY);
        }
        locationCache.start();
        //Asks for permission if GPS is not enabled on the device.
        // Note: Will ask for permission even if location is enabled, but not using GPS
        if(!locationCache.isGPSEnabled()
                && !preferenceManager.getNeverAskGPSPermission()
                && preferenceManager.getOnBoardingComplete()
                && preferenceManager.getLocationEnabled()
                && !askedGPSPermission) {
            askedGPSPermission = true;
            showGPSPermissionDialog();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent.getAction().equals(Intent.ACTION_MAIN)) {
            return;
        }
        final Bundle bundle = intent.getExtras();
        final String url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
        final String query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
        final boolean isNotificationClicked = bundle != null ? bundle.getBoolean(Constants.NOTIFICATION_CLICKED) : false;
        final TabFragment newTab = new TabFragment();
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
        newTab.setArguments(args);
        mFragmentsList.add(newTab);
        telemetry.sendNewTabSignal(mFragmentsList.size(), false);
        showTab(mFragmentsList.size()-1);
    }

    private void showGPSPermissionDialog() {
        LayoutInflater inflater = LayoutInflater.from(this);
        View dialogLayout = inflater.inflate(R.layout.dialog_gps_permission, null);
        CheckBox dontShowAgain = (CheckBox) dialogLayout.findViewById(R.id.skip);
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
                                dialog.cancel();
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

    @Override
    protected void onPause() {
        super.onPause();
        gcmReceiver.unregister();
        pauseAllWebViews();
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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            performExitCleanUp();
        } else {
            //only perform clean up after the last tab is closed.
            // NOTE! number of appTasks is zero after the last tab is closed
            ActivityManager activityManager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
            if (activityManager.getAppTasks().size() == 0) {
                performExitCleanUp();
            }
        }
    }

    private void performExitCleanUp() {
        if (preferenceManager.getClearCacheExit()) {
            WebUtils.clearCache(this);
        }
        if (preferenceManager.getClearHistoryExitEnabled()) {
            //TODO reintroduce this
            mFragmentsList.get(0).historyDatabase.clearHistory(false);
            preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.CLEAR_QUERIES);
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
        createTab(event.msg, mFragmentsList.get(getCurrentTabPosition()).state.isIncognito());
//        // TODO: Temporary workaround, we want to open a new activity!
//        bus.post(new CliqzMessages.OpenLink(event.url));
    }

    @Subscribe
    public void createNewTab(BrowserEvents.NewTab event) {
        createTab("", event.isIncognito);
    }

    @Subscribe
    public void showTabManager(BrowserEvents.ShowTabManager event) {
        mTabsAdapter.notifyDataSetChanged();
        drawerLayout.openDrawer(Gravity.LEFT);
    }

    private void createTab(Message msg, boolean isIncognito) {
        final TabFragment newTab = new TabFragment();
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        args.putBoolean(Constants.KEY_NEW_TAB_MESSAGE, true);
        BrowserApp.pushNewTabMessage(msg);
        newTab.setArguments(args);
        mFragmentsList.add(newTab);
        telemetry.sendNewTabSignal(mFragmentsList.size(), isIncognito);
        showTab(mFragmentsList.size()-1);
    }

    private void createTab(String url, boolean isIncognito) {
        final TabFragment newTab = new TabFragment();
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        if(url != null && Patterns.WEB_URL.matcher(url).matches()) {
            args.putString(Constants.KEY_URL, url);
        }
        newTab.setArguments(args);
        mFragmentsList.add(newTab);
        telemetry.sendNewTabSignal(mFragmentsList.size(), isIncognito);
        showTab(mFragmentsList.size()-1);
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
    public void goToHistory(Messages.GoToHistory event) {
        telemetry.resetBackNavigationVariables(-1);
        final FragmentManager fm = getSupportFragmentManager();
        final FragmentTransaction transaction = fm.beginTransaction();
/*
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            transaction.
                    setCustomAnimations(R.anim.enter_slide_down, R.anim.exit_slide_down,
                            R.anim.enter_slide_up, R.anim.exit_slide_up);
        } else {
            transaction.setCustomAnimations(R.anim.fade_in, R.anim.fade_out,
                    R.anim.fade_in, R.anim.fade_out);
        }
*/
        //workaround for getting the mode in hitroy fragment
        currentMode = mFragmentsList.get(getCurrentTabPosition())
                .state.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        transaction.replace(R.id.content_frame, mHistoryFragment, HISTORY_FRAGMENT_TAG)
                .addToBackStack(null)
                .commit();
    }

    @Subscribe
    public void goToSuggestions(Messages.GoToSuggestions event) {
        telemetry.resetBackNavigationVariables(-1);
        final FragmentManager fm = getSupportFragmentManager();
        final FragmentTransaction transaction = fm.beginTransaction();
/*
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            transaction.
                    setCustomAnimations(R.anim.enter_slide_down, R.anim.exit_slide_down,
                            R.anim.enter_slide_up, R.anim.exit_slide_up);
        } else {
            transaction.setCustomAnimations(R.anim.fade_in, R.anim.fade_out,
                    R.anim.fade_in, R.anim.fade_out);
        }
*/
        transaction.replace(R.id.content_frame
                , mFreshTabFragment, SUGGESTIONS_FRAGMENT_TAG)
                .addToBackStack(null)
                .commit();
    }

    @Subscribe
    public void goToLink(Messages.GoToLink event) {
        final FragmentManager fm = getSupportFragmentManager();
        final String url = event.url;
        fm.popBackStack();
        fm.addOnBackStackChangedListener(new FragmentManager.OnBackStackChangedListener() {
            @Override
            public void onBackStackChanged() {
                fm.removeOnBackStackChangedListener(this);
                bus.post(new CliqzMessages.OpenHistoryLink(url));
            }
        });
    }

    @Subscribe
    public void goToSettings(Messages.GoToSettings event) {
        startActivity(new Intent(this, SettingsActivity.class));
    }

    @Subscribe
    public void goToSearch(Messages.GoToSearch event) {
        final FragmentManager fm = getSupportFragmentManager();
        fm.popBackStack();
        final String query = event.query;
        if (event.query != null) {
            fm.addOnBackStackChangedListener(new FragmentManager.OnBackStackChangedListener() {
                @Override
                public void onBackStackChanged() {
                    fm.removeOnBackStackChangedListener(this);
                    bus.post(new CliqzMessages.NotifyQuery(query));
                }
            });
        }
    }

    @Subscribe
    public void exit(Messages.Exit event) {
        deleteTab(getCurrentTabPosition());
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
        telemetry.sendLifeCycleSignal(Telemetry.Action.INSTALL);
        setupContentView();
    }

    //returns screen that is visible
    private String getCurrentVisibleFragmentName() {
        String name = "";
        final int currentTabPos = getCurrentTabPosition();
        if (mHistoryFragment != null && mHistoryFragment.isVisible()) {
            name = "past";
        } else if (currentTabPos != -1){
            name = mFragmentsList.get(getCurrentTabPosition()).state.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        } else {
            name = "cards";
        }
        return name;
    }

    /**
     * Fully copied from the code at https://github.com/googlesamples/google-services/blob/master/android/gcm/app/src/main/java/gcm/play/android/samples/com/gcmquickstart/MainActivity.java
     * It checks form Google Play Services APK.
     */
    private boolean checkPlayServices() {
        GoogleApiAvailability apiAvailability = GoogleApiAvailability.getInstance();
        int resultCode = apiAvailability.isGooglePlayServicesAvailable(this);
        if (resultCode != ConnectionResult.SUCCESS) {
            if (apiAvailability.isUserResolvableError(resultCode)) {
                apiAvailability.getErrorDialog(this, resultCode, PLAY_SERVICES_RESOLUTION_REQUEST)
                        .show();
            } else {
                Log.i(TAG, "This device is not supported.");
                // finish(); do not finish the app
            }
            return false;
        }
        return true;
    }

    private int getCurrentTabPosition() {
        for(TabFragment tabFragment : mFragmentsList) {
            if (tabFragment.isVisible()) {
                return mFragmentsList.indexOf(tabFragment);
            }
        }
        return -1;
    }

    private void showTab(int position) {
        final FragmentManager fm = getSupportFragmentManager();
        fm.beginTransaction().replace(R.id.content_frame, mFragmentsList.get(position), SEARCH_FRAGMENT_TAG).commit();
    }

    private synchronized void deleteTab(int position) {
        if (position >= mFragmentsList.size()) {
            return;
        }
        int current = getCurrentTabPosition();
        if (current < 0) {
            return;
        }
        TabFragment reference = mFragmentsList.get(position);
        telemetry.sendTabCloseSignal(mFragmentsList.size() - 1, reference.state.isIncognito());
        if (reference == null) {
            return;
        }
        if (current > position) {
            mFragmentsList.remove(position);
            mTabsAdapter.notifyDataSetChanged();
            reference.mLightningView.onDestroy();
        } else if (mFragmentsList.size() > position + 1) {
            if (current == position) {
                showTab(position + 1);
                mFragmentsList.remove(position);
            } else {
                mFragmentsList.remove(position);
            }
            mTabsAdapter.notifyDataSetChanged();
            reference.mLightningView.onDestroy();
        } else if (mFragmentsList.size() > 1) {
            if (current == position) {
                showTab(position - 1);
            }
            mFragmentsList.remove(position);
            mTabsAdapter.notifyDataSetChanged();
            reference.mLightningView.onDestroy();
        } else {
            finish();
        }
        Log.d(Constants.TAG, "deleted tab");
    }

    private void pauseAllWebViews() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
        }
        //Any webview is enough. Calling pauseTimers() on any one webview will pause timers of all webviews
        final WebView firstWebview = mFragmentsList.get(0).mLightningView.getWebView();
        if (firstWebview != null) {
            firstWebview.pauseTimers();
        }
        for (TabFragment tabFragment : mFragmentsList) {
            if (tabFragment.mLightningView == null) {
                continue;
            }
            final WebView webView = tabFragment.mLightningView.getWebView();
            if (webView != null) {
                webView.onPause();
            }
        }
        if (searchWebView != null) {
            searchWebView.onPause();
        }
        if (mHistoryFragment.mHistoryWebView != null) {
            mHistoryFragment.mHistoryWebView.onPause();
        }
    }

    private void resumeAllWebViews() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
        }
        //Any webview is enough. Calling resumeTimers() on any one webview will resume timers of all webviews
        final WebView firstWebview = mFragmentsList.get(0).mLightningView.getWebView();
        if (firstWebview != null) {
            firstWebview.resumeTimers();
        }
        for (TabFragment tabFragment : mFragmentsList) {
            if (tabFragment.mLightningView == null) {
                continue;
            }
            final WebView webView = tabFragment.mLightningView.getWebView();
            if (webView != null) {
                webView.onResume();
            }
        }
        if (searchWebView != null) {
            searchWebView.onResume();
        }
        if (mHistoryFragment.mHistoryWebView != null) {
            mHistoryFragment.mHistoryWebView.onResume();
        }
    }

    private class DrawerListener implements DrawerLayout.DrawerListener {

        @Override
        public void onDrawerOpened(View v) {
            telemetry.sendTabsMenuOpen(mFragmentsList.size());
        }

        @Override
        public void onDrawerClosed(View drawerView) {

        }

        @Override
        public void onDrawerSlide(View v, float arg) {

        }

        @Override
        public void onDrawerStateChanged(int newState) {
            if (newState == DrawerLayout.STATE_DRAGGING && !drawerLayout.isDrawerOpen(Gravity.LEFT)) {
                mTabsAdapter.notifyDataSetChanged();
            }
        }

    }

    protected class TabsAdapter extends RecyclerView.Adapter<TabsAdapter.TabViewHolder> {

        private final Bitmap defaultFavicon;

        private final Context context;
        private final int layoutResourceId;
        private List<TabFragment> data = null;

        public TabsAdapter(Context context, int layoutResourceId, List<TabFragment> data) {
            this.defaultFavicon = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_webpage);
            this.context = context;
            this.layoutResourceId = layoutResourceId;
            this.data = data;
        }

        @Override
        public TabViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
            final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
            final View view = inflater.inflate(layoutResourceId, parent, false);
            return new TabViewHolder(view);
        }

        @Override
        public void onBindViewHolder(TabViewHolder holder, final int position) {
            holder.layout.setTag(position);
            holder.exitButton.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    deleteTab(position);
                }
            });
            holder.layout.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    final FragmentManager fm = getSupportFragmentManager();
                    fm.beginTransaction().replace(R.id.content_frame, mFragmentsList.get(position)
                                                    ,SEARCH_FRAGMENT_TAG).commit();
                    fm.executePendingTransactions();
                    drawerLayout.closeDrawers();
                    telemetry.sendTabOpenSignal(position, mFragmentsList.size(),
                            mFragmentsList.get(position).state.isIncognito());
                }
            });
            ViewCompat.jumpDrawablesToCurrentState(holder.exitButton);
            TabFragment tabFragment = data.get(position);
            final String title;
            if (tabFragment.state.getMode() == CliqzBrowserState.Mode.SEARCH) {
                title = tabFragment.state.getQuery();
            } else {
                title = tabFragment.getPageTitle();
            }
            holder.title.setText(title.isEmpty() ? getString(R.string.home) : title);
            final Bitmap favIcon = tabFragment.getFavicon();
            holder.icon.setImageBitmap(favIcon != null ? favIcon : defaultFavicon);
            if (position == getCurrentTabPosition()) {
                holder.layout.setBackgroundColor(ContextCompat.getColor(MainActivity.this, R.color.gray_list_bg));
            } else {
                holder.layout.setBackgroundColor(ContextCompat.getColor(MainActivity.this, R.color.white));
            }
        }

        @Override
        public int getItemCount() {
            return data != null ? data.size() : 0;
        }

        public class TabViewHolder extends RecyclerView.ViewHolder {

            final TextView title;
            final ImageView icon;
            final ImageView exit;
            final FrameLayout exitButton;
            final LinearLayout layout;

            public TabViewHolder(View view) {
                super(view);
                title = (TextView) view.findViewById(R.id.textTab);
                icon = (ImageView) view.findViewById(R.id.faviconTab);
                exit = (ImageView) view.findViewById(R.id.deleteButton);
                layout = (LinearLayout) view.findViewById(R.id.tab_item_background);
                exitButton = (FrameLayout) view.findViewById(R.id.deleteAction);
            }
        }
    }
}
