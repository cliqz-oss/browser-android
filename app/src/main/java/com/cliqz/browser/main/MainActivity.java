package com.cliqz.browser.main;

import android.Manifest;
import android.app.ActivityManager;
import android.app.AlertDialog;
import android.app.SearchManager;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.provider.Settings;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentTransaction;
import android.support.v4.content.ContextCompat;
import android.support.v4.view.ViewPager;
import android.support.v7.app.AppCompatActivity;
import android.util.Log;
import android.util.Patterns;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.widget.CheckBox;
import android.widget.CompoundButton;

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
import com.cliqz.browser.widget.MainViewContainer;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import java.io.File;

import javax.inject.Inject;

import acr.browser.lightning.activity.SettingsActivity;
import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.WebUtils;

import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;

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

    public MainFragment mMainFragment;
    private FreshTabFragment mFreshTabFragment;
    private HistoryFragment mHistoryFragment;
    private OnBoardingAdapter onBoardingAdapter;
    private ViewPager pager;
    private boolean askedGPSPermission = false;
    private CustomViewHandler mCustomViewHandler;
    // private boolean mIsIncognito;
    private boolean isColdStart = false;
    // Keep the current shared browsing state
    private CliqzBrowserState mBrowserState;

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
        timings.setAppStartTime();
        isColdStart = true;

        // Restore state
        final CliqzBrowserState oldState = savedInstanceState != null ?
                (CliqzBrowserState) savedInstanceState.getSerializable(SAVED_STATE) :
                null;
        mBrowserState = oldState != null ? oldState : new CliqzBrowserState();

        // Translucent status bar only on selected platforms
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
//            final Window window = getWindow();
//            window.setFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS,
//                    WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
//        }

//        mFreshTabFragment = new FreshTabFragment();
        mHistoryFragment = new HistoryFragment(this);
        mMainFragment = new MainFragment();

        // Ignore intent if we are being recreated
        final Intent intent = savedInstanceState == null ? getIntent() : null;
        final String url;
        final boolean message;
        final String query;
        final boolean isNotificationClicked;
        if (intent != null) {
            final Bundle bundle = intent.getExtras();
            mBrowserState.setIncognito(bundle != null ? bundle.getBoolean(Constants.KEY_IS_INCOGNITO) : false);
            message = BrowserApp.hasNewTabMessage();
            url = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getDataString() : null;
            query = Intent.ACTION_WEB_SEARCH.equals(intent.getAction()) ? intent.getStringExtra(SearchManager.QUERY) : null;
            isNotificationClicked = bundle != null ? bundle.getBoolean(Constants.NOTIFICATION_CLICKED) : false;
        } else {
            url = null;
            message = false;
            query = null;
            isNotificationClicked = false;
            mBrowserState.setIncognito(false);
        }
        if(isNotificationClicked) {
            telemetry.sendNewsNotificationSignal(Telemetry.Action.CLICK);
        }
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, mBrowserState.isIncognito());
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
        mMainFragment.setArguments(args);

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

        final int taskBarColor = mBrowserState.isIncognito() ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
        final Bitmap appIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
        final ActivityManager.TaskDescription taskDescription;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            taskDescription = new ActivityManager.TaskDescription(
                getString(R.string.cliqz_app_name), appIcon, ContextCompat.getColor(this, taskBarColor));
        setTaskDescription(taskDescription);
        }

        if (checkPlayServices()) {
            final Intent registrationIntent = new Intent(this, RegistrationIntentService.class);
            startService(registrationIntent);
    }
    }

    public CliqzBrowserState getBrowserState() {
        return mBrowserState;
    }

    private void setupContentView() {
        final MainViewContainer content = new MainViewContainer(this);
        content.setFitsSystemWindows(true);
        content.setBackgroundColor(Color.WHITE);
        final LayoutParams params = new LayoutParams(MATCH_PARENT, MATCH_PARENT);
        content.setId(CONTENT_VIEW_ID);
        setContentView(content, params);
        final FragmentManager fm = getSupportFragmentManager();
        fm.beginTransaction().add(CONTENT_VIEW_ID, mMainFragment, SEARCH_FRAGMENT_TAG).commit();
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
        if(!name.isEmpty() && !isColdStart) {
            telemetry.sendStartingSignals(name, "warm");
        }
        isColdStart = false;
    }

    @Override
    protected void onResume() {
        super.onResume();
        gcmReceiver.register();
        if (!isColdStart) {
            timings.setAppStartTime();
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
        String context = getCurrentVisibleFragmentName();
        timings.setAppStopTime();
        if(!context.isEmpty()) {
            telemetry.sendClosingSignals(Telemetry.Action.CLOSE, context);
        }
        locationCache.stop();
        mBrowserState.setTimestamp(System.currentTimeMillis());
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putSerializable(SAVED_STATE, mBrowserState);
        super.onSaveInstanceState(outState);
    }

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
            WebUtils.clearCache(mMainFragment.mLightningView.getWebView());
        }
        if (preferenceManager.getClearHistoryExitEnabled()) {
            mMainFragment.historyDatabase.clearHistory(false);
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
        createTab(event.msg, mBrowserState.isIncognito());
//        // TODO: Temporary workaround, we want to open a new activity!
//        bus.post(new CliqzMessages.OpenLink(event.url));
    }

    @Subscribe
    public void createNewTab(BrowserEvents.NewTab event) {
        createTab("", event.isIncognito);
    }

    private void createTab(Message msg, boolean isIncognito) {
        final Intent intent = new Intent(getBaseContext(), MainActivity.class);
        intent.putExtra(Constants.KEY_IS_INCOGNITO, isIncognito);
        intent.putExtra(NEW_TAB_MSG, true);
        BrowserApp.pushNewTabMessage(msg);
        intent.addFlags(Intent.FLAG_ACTIVITY_MULTIPLE_TASK
                | Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
        startActivity(intent);
    }

    private void createTab(String url, boolean isIncognito) {
        final Intent intent = new Intent(getBaseContext(), MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        if (url != null && !url.isEmpty()) {
            intent.setData(Uri.parse(url));
        }
        intent.putExtra(Constants.KEY_IS_INCOGNITO, isIncognito);
        intent.addFlags(Intent.FLAG_ACTIVITY_MULTIPLE_TASK
                | Intent.FLAG_ACTIVITY_NEW_DOCUMENT);
        startActivity(intent);
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
        transaction.replace(CONTENT_VIEW_ID, mHistoryFragment, HISTORY_FRAGMENT_TAG)
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
        transaction.replace(CONTENT_VIEW_ID, mFreshTabFragment, SUGGESTIONS_FRAGMENT_TAG)
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            //This overrides system's task management and always brings other open cliqz tab(if any) to front
//            ActivityManager activityManager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
//            List<ActivityManager.AppTask> cliqzTasks = activityManager.getAppTasks();
//            if (cliqzTasks.size() > 1) {
//                cliqzTasks.get(1).moveToFront();
//            }
            finishAndRemoveTask();
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
        telemetry.sendLifeCycleSignal(Telemetry.Action.INSTALL);
        setupContentView();
    }

    //returns screen that is visible
    private String getCurrentVisibleFragmentName() {
        String name = "";
        if (mMainFragment != null && mMainFragment.isVisible()) {
            name = mBrowserState.getMode() == CliqzBrowserState.Mode.SEARCH ? "cards" : "web";
        } else if (mHistoryFragment != null && mHistoryFragment.isVisible()) {
            name = "past";
        } else if (mFreshTabFragment != null && mFreshTabFragment.isVisible()) {
            name = "future";
        } else {
            name = "web";
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
}
