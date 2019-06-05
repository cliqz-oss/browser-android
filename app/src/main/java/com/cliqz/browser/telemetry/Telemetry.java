package com.cliqz.browser.telemetry;

import android.Manifest;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.ReceiverCallNotAllowedException;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Debug;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.util.Log;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.main.SendTabErrorTypes;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
* @author Ravjit Uppal
*/
public class Telemetry {

    // This tag is only used to quick filter the telemetry stuff on the console using this command:
    // adb logcat '*:S TELEMETRY_DEBUG'
    private final static String TELEMETRY_TAG = "TELEMETRY_DEBUG";

    private static final int BATCH_SIZE = 50;
    private JSONArray mSignalCache = new JSONArray();

    private final PreferenceManager preferenceManager;
    private final HistoryDatabase historyDatabase;
    private final Timings timings;

    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    private String currentNetwork;
    private Context context;
    private int batteryLevel, forwardStep, backStep, urlLength;
    private boolean isFirstNetworkSignal = true;
    public boolean backPressed;
    public boolean showingCards;

    public Telemetry(Context context, PreferenceManager preferenceManager,
                     HistoryDatabase historyDatabase, Timings timings) {
        this.context = context;
        this.preferenceManager = preferenceManager;
        this.historyDatabase = historyDatabase;
        this.timings = timings;
        batteryLevel = -1;
        registerReceiversIfPossible(context);
    }

    private void registerReceiversIfPossible(Context context) {
        try {
            context.registerReceiver(new BatteryInfoReceiver(),
                    new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
            context.registerReceiver(new NetworkChangeReceiver(),
                    new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));
        } catch (ReceiverCallNotAllowedException e) {
            // Some context (i.e. lightweight ones) can't register receivers
        }
    }

    /**
     * Sends a telemetry signal related to the application life cycle: install/update
     * @param action type of the signal: App install or App update
     */
    public void sendLifeCycleSignal(String action) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, action);
            if (TelemetryKeys.INSTALL.equals(action)) {
                signal.put(TelemetryKeys.ADVERT_ID, preferenceManager.getAdvertID());
                signal.put(TelemetryKeys.DISTRIBUTION, preferenceManager.getDistribution());
                signal.put(TelemetryKeys.ENCODING_EXCEPTION, preferenceManager.getDistributionException());
                signal.put(TelemetryKeys.REFERRER_URL, preferenceManager.getReferrerUrl());
                signal.put(TelemetryKeys.VERSION_DIST, BuildConfig.VERSION_NAME);
                sendEnvironmentSignal(true);
            }
        } catch (JSONException e) {
            logError(TelemetryKeys.ACTIVITY);
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the app is closed
     * @param action One of the two: "close" or "kill"
     * @param context The screen which is visible when the this signal is sent.
     */
    private void sendAppCloseSignal(String action, String context) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.APP_STATE_CHANGE);
            signal.put(TelemetryKeys.STATE, action);
            signal.put(TelemetryKeys.NETWORK, getNetworkState());
            signal.put(TelemetryKeys.BATTERY, batteryLevel);
            signal.put(TelemetryKeys.MEMORY, getMemoryUsage());
            signal.put(TelemetryKeys.CONTEXT, context);
            if(action.equals(TelemetryKeys.CLOSE)) {
                signal.put(TelemetryKeys.TIME_USED, timings.getAppUsageTime());
            }
        } catch (JSONException e) {
            logError(TelemetryKeys.APP_STATE_CHANGE);
        }
        saveSignal(signal, true);
    }

    /**
     * Send a telemetry signal when the app is opened
     * @param startType One of the two: warm or cold
     * @param context  The screen which is visible when the this signal is sent.
     */
    private void sendAppStartupSignal(String context, String startType) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.APP_STATE_CHANGE);
            signal.put(TelemetryKeys.STATE, TelemetryKeys.OPEN);
            signal.put(TelemetryKeys.NETWORK, getNetworkState());
            signal.put(TelemetryKeys.BATTERY, batteryLevel);
            signal.put(TelemetryKeys.CONTEXT, context);
            signal.put(TelemetryKeys.STARTUP_TYPE, startType);
            signal.put(TelemetryKeys.STARTUP_TIME, timings.getAppStartUpTime());
            signal.put(TelemetryKeys.MEMORY, getMemoryUsage());
        } catch (JSONException e) {
            logError(TelemetryKeys.APP_STATE_CHANGE);
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar gets focus
     * @param view The screen which is visible when the signal is sent. (Web or Cards)
     */
    public void sendURLBarFocusSignal(Boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.FOCUS);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.SEARCH);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar looses focus
     */
    public void sendURLBarBlurSignal(boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.BLUR);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.SEARCH);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal for each key stroke by the user in the search bar.
     * Only the query length is logged, actual query is not logged.
     * @param action It tells if the user typed a character or deleted a character
     * @param length Length of the query in the search bar
     */
    public void sendTypingSignal(String action, int length) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, action);
            signal.put(TelemetryKeys.LENGTH, length);
        } catch (JSONException e) {
            logError(TelemetryKeys.ACTIVITY);
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the user pastes something in the search bar
     * @param length Length of the text pasted in the search bar
     */
    public void sendPasteSignal(int length) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.PASTE);
            signal.put(TelemetryKeys.LENGTH, length);
        } catch (JSONException e) {
            logError(TelemetryKeys.ACTIVITY);
        }
        saveSignal(signal, false);
    }

    /**
     *Sends a telemetry signal about the environment when the app starts.
     *This signal is sent at most once an hour unless force sent.
     * @param forceSend If true the method will not respect the 1 hour rule for sending the signal
     */
    private void sendEnvironmentSignal(boolean forceSend) {
        final Intent browserIntent = new Intent("android.intent.action.VIEW", Uri.parse("http://"));
        final ResolveInfo resolveInfo = context.getPackageManager().resolveActivity(browserIntent, PackageManager.MATCH_DEFAULT_ONLY);
        final boolean isDefault = resolveInfo.activityInfo.packageName.equals(BuildConfig.APPLICATION_ID);
        final long oneHour = 3600000;
        final long oneDay = 86400000;
        long days = 0;
        final long timeSinceLastSingal = timings.getTimeSinceLastEnvSignal();
        if(timeSinceLastSingal < oneHour && !forceSend) {
            return;
        }
        timings.setLastEnvSingalTime();
        int historySize = 0;
        try {
            historySize = historyDatabase.getHistoryItemsCount();
        } catch (Throwable throwable) {
            logError(TelemetryKeys.ENVIRONMENT);
        }
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ENVIRONMENT);
            signal.put(TelemetryKeys.DEVICE, Build.MODEL);
            signal.put(TelemetryKeys.LANGUAGE, getLanguage());
            signal.put(TelemetryKeys.VERSION, BuildConfig.CLIQZ_EXT_VERSION);
            signal.put(TelemetryKeys.VERSION_DIST, BuildConfig.VERSION_NAME);
            signal.put(TelemetryKeys.VERSION_HOST, BuildConfig.LIGHTNING_VERSION_NAME);
            signal.put(TelemetryKeys.VERSION_OS, Build.VERSION.SDK_INT);
            signal.put(TelemetryKeys.DEFAULT_SEARCH_ENGINE, getDefaultSearchEngine());
            signal.put(TelemetryKeys.HISTORY_URLS, historySize);
            signal.put(TelemetryKeys.DISTRIBUTION, preferenceManager.getDistribution());
            signal.put(TelemetryKeys.PREFS, getPrefsJSON());
            signal.put(TelemetryKeys.AB_TEST_LIST, preferenceManager.getABTestList());
            signal.put(TelemetryKeys.DEFAULT_BROWSER, isDefault);
        } catch (JSONException e) {
            logError(TelemetryKeys.ENVIRONMENT);
        }
        if(historySize > 0) {
            long firstItemTime = historyDatabase.getFirstHistoryItemTimestamp();
            days = (getUnixTimeStamp() - firstItemTime) / oneDay;
        }
        try {
            signal.put(TelemetryKeys.HISTORY_DAYS, days);
        } catch (JSONException e) {
            Log.e(TELEMETRY_TAG, "Can't send telemetry");
        }
        saveSignal(signal, false);
    }

    private JSONObject getPrefsJSON() {
        JSONObject prefsJson = new JSONObject();
        try {
            prefsJson.put(TelemetryKeys.BLOCK_EXPLICIT, preferenceManager.getBlockAdultContent());
            prefsJson.put(TelemetryKeys.ENABLE_COOKIES, preferenceManager.getCookiesEnabled());
            prefsJson.put(TelemetryKeys.SAVE_PASSWORDS, preferenceManager.getSavePasswordsEnabled());
            prefsJson.put(TelemetryKeys.CLEAR_CACHE, preferenceManager.getClearCacheExit());
            prefsJson.put(TelemetryKeys.CLEAR_HISTORY, preferenceManager.getClearHistoryExitEnabled());
            prefsJson.put(TelemetryKeys.CLEAR_COOKIES, preferenceManager.getClearCookiesExitEnabled());
            prefsJson.put(TelemetryKeys.ENABLE_AUTOCOMPLETE, preferenceManager.getAutocompletionEnabled());
            prefsJson.put(TelemetryKeys.HUMAN_WEB, preferenceManager.getHumanWebEnabled());
            prefsJson.put(TelemetryKeys.BLOCK_ADS, preferenceManager.getAdBlockEnabled());
            prefsJson.put(TelemetryKeys.FAIR_BLOCKING, preferenceManager.getOptimizedAdBlockEnabled());
            prefsJson.put(TelemetryKeys.CONFIG_LOCATION, preferenceManager.getLastKnownLocation());
            prefsJson.put(TelemetryKeys.NOTIFICATION, preferenceManager.getNewsNotificationEnabled());
            prefsJson.put(TelemetryKeys.LOCATION_ACCESS_SYSTEM, isLocationGranted());
        } catch (JSONException e) {
            Log.e(TELEMETRY_TAG, "Can't read preferences");
        }
        return prefsJson;
    }

    //Send a telemetry signal of the network state, when the app closes and when the network changes
    private void sendNetworkStatus() {
        long duration = timings.getNetworkUsageTime();
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NETWORK_STATUS);
            signal.put(TelemetryKeys.NETWORK, currentNetwork);
            signal.put(TelemetryKeys.DURATION, duration);
        } catch (JSONException e) {
            logError(TelemetryKeys.NETWORK_STATUS);
        }
        timings.setNetworkStartTime();
        currentNetwork = getNetworkState();
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when the app starts/comes to foreground
     * @param context the layer which is visble
     * @param startType Either warm or cold
     */
    public void sendStartingSignals(String context, String startType) {
        timings.setNetworkStartTime();
        currentNetwork = getNetworkState();
        sendEnvironmentSignal(false);
        sendAppStartupSignal(context, startType);
    }

    /**
     * Send telemetry signal when the app closes/goes to background
     * @param context the layer which is visible
     */
    public void sendClosingSignals(String closeOrKill, String context) {
        if (TelemetryKeys.CLOSE.equals(closeOrKill)) {
            sendNetworkStatus();
        }
        sendAppCloseSignal(closeOrKill, context);
    }

    /**
     * Send telemetry signal when the user navigates deeper into the web-page
     * @param urlLength length of the url of the new page
     */
    public void sendNavigationSignal(int urlLength) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NAVIGATION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.LOCATION_CHANGE);
            signal.put(TelemetryKeys.STEP, forwardStep);
            signal.put(TelemetryKeys.URL_LENGTH, this.urlLength);
            signal.put(TelemetryKeys.DISPLAY_TIME, timings.getPageDisplayTime());
        } catch (JSONException e) {
            logError(TelemetryKeys.NAVIGATION);
        }
        forwardStep++;
        timings.setPageStartTime();
        this.urlLength =urlLength;
        resetBackNavigationVariables(urlLength);
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when the user presses the back button
     * @param currentContext The screen which was visible before pressing back
     * @param nextContext The screen which is visible after pressing back
     * @param urlLength Length of the url/query in the url bar
     */
    public void sendBackPressedSignal(String currentContext, String nextContext, int urlLength) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NAVIGATION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.BACK);
            signal.put(TelemetryKeys.STEP, this.backStep);
            signal.put(TelemetryKeys.URL_LENGTH, this.urlLength);
            signal.put(TelemetryKeys.DISPLAY_TIME, timings.getPageDisplayTime());
            signal.put(TelemetryKeys.CURRENT_CONTEXT, currentContext);
            signal.put(TelemetryKeys.NEXT_CONTEXT, nextContext);
        } catch (JSONException e) {
            logError(TelemetryKeys.NAVIGATION);
        }
        backStep++;
        timings.setPageStartTime();
        this.urlLength = urlLength;
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when the user presses enter after typing in the url bar
     * @param isQuery True if the content of the urlbar is a query, false if its an url(direct/autcompleted)
     * @param isAutocompleted True if the url is autocompleted, false if it is typed completely
     * @param queryLength Length of the typed characters
     * @param autoCompleteLength Length of the entire url if it is autcompleted, -1 if not autocompleted
     */
    public void sendResultEnterSignal(boolean isQuery, boolean isAutocompleted, int queryLength, int autoCompleteLength) {
        JSONObject signal = new JSONObject();
        try {
            JSONArray positionType = new JSONArray();
            if(isQuery) {
                positionType.put(TelemetryKeys.INBAR_QUERY);
            } else {
                positionType.put(TelemetryKeys.INBAR_URL);
            }
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.RESULT_ENTER);
            signal.put(TelemetryKeys.CURRENT_POSITION, -1);
            signal.put(TelemetryKeys.EXTRA, null);
            signal.put(TelemetryKeys.SEARCH, false);
            signal.put(TelemetryKeys.HAS_IMAGE, false);
            signal.put(TelemetryKeys.CLUSTERING_OVERRIDE, false);
            signal.put(TelemetryKeys.NEW_TAB, false);
            signal.put(TelemetryKeys.QUERY_LENGTH, queryLength);
            signal.put(TelemetryKeys.REACTION_TIME, timings.getReactionTime());
            signal.put(TelemetryKeys.URLBAR_TIME, timings.getUrlBarTime());
            signal.put(TelemetryKeys.POSITION_TYPE, positionType);
            signal.put(TelemetryKeys.INNER_LINK, isAutocompleted);
            signal.put(TelemetryKeys.VERSION, BuildConfig.VERSION_NAME);
            if(isAutocompleted) {
                signal.put(TelemetryKeys.AUTOCOMPLETED, "url");
                signal.put(TelemetryKeys.AUTOCOMPLETED_LENGTH, autoCompleteLength);
            }
        } catch (JSONException e) {
            logError(TelemetryKeys.ACTIVITY);
        }
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when user shares a link
     * @param context "web" if user shared link of a webpage, "cards" if user shared link of a card
     */
    public void sendShareSignal(String context) {
       JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SHARE);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET_TYPE, TelemetryKeys.MAIN);
            signal.put(TelemetryKeys.CONTEXT, context);
        } catch (JSONException e) {
            logError(TelemetryKeys.SHARE);
        }
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when user receives, opens, enables, disables or dismisses news notification
     * @param action type of signal
     */
    public void sendNotificationSignal(String action, String type, boolean force) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NOTIFICATION);
            signal.put(TelemetryKeys.VIEW, type);
            signal.put(TelemetryKeys.ACTION, action);
        } catch (JSONException e) {
            logError(TelemetryKeys.NOTIFICATION);
        }
        if (TelemetryKeys.RECEIVE.equals(action)) {
            sendEnvironmentSignal(true);
        }
        saveSignal(signal, force);
    }

    /**
     * Send signal whenever a new tab is opened
     * @param count Number of open tabs
     */
    public void sendNewTabSignal(int count) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.OPEN_TABS);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.NEW_TAB);
            signal.put(TelemetryKeys.TAB_COUNT, count);
        } catch (JSONException e) {
            logError(TelemetryKeys.OPEN_TABS);
        }
        saveSignal(signal, false);
    }

    /**
     * Send singal when user clicks on a tab from the tabs list
     * @param position 0 based position of the tab in the list
     * @param count total number of tabs in the list
     * @param isIncognito whether the tab is incognito or not
     */
    public void sendTabOpenSignal(int position, int count, boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.OPEN_TABS);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.TAB);
            signal.put(TelemetryKeys.INDEX, position);
            signal.put(TelemetryKeys.COUNT, count);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
        } catch (JSONException e) {
            logError(TelemetryKeys.OPEN_TABS);
        }
        saveSignal(signal, false);
    }

    /**
     * Send signal when user deletes a tab
     * @param count number of tabs in the list after deleting
     * @param isIncognito whether the tab is incognito or not
     */
    public void sendTabCloseSignal(String direction, int position, int count, boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.OPEN_TABS);
            signal.put(TelemetryKeys.ACTION, direction);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.TAB);
            signal.put(TelemetryKeys.INDEX, position);
            signal.put(TelemetryKeys.COUNT, count);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
        } catch (JSONException e) {
            logError(TelemetryKeys.OPEN_TABS);
        }
        saveSignal(signal, false);
    }

    public void sendVideoPageSignal(boolean isDownloadable) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.VIDEO_DOWNLOADER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.PAGE_LOAD);
            signal.put(TelemetryKeys.IS_DOWNLOADABLE, isDownloadable);
        } catch (JSONException e) {
            logError(TelemetryKeys.VIDEO_DOWNLOADER);
        }
        saveSignal(signal, false);
    }

    public void sendVideoDownloadedSignal(boolean success) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.VIDEO_DOWNLOADER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.DOWNLOAD);
            signal.put(TelemetryKeys.IS_SUCCESS, success);
        } catch (JSONException e) {
            logError(TelemetryKeys.VIDEO_DOWNLOADER);
        }
        saveSignal(signal, false);
    }

    public void sendVideoDialogSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.VIDEO_DOWNLOADER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.VIDEO_DOWNLOADER);
        }
        saveSignal(signal, false);
    }

    public void sendSettingsMenuSignal(String target, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SETTINGS);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.SETTINGS);
        }
        saveSignal(signal, false);
    }

    public void sendSettingsMenuSignal(String target, String view, boolean state) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SETTINGS);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.STATE, state ? TelemetryKeys.ON : TelemetryKeys.OFF);
        } catch (JSONException e) {
            logError(TelemetryKeys.SETTINGS);
        }
        saveSignal(signal, false);
    }

    public void sendSettingsMenuSignal(String view, long time) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SETTINGS);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.BACK);
            signal.put(TelemetryKeys.SHOW_DURATION,time);
        } catch (JSONException e) {
            logError(TelemetryKeys.SETTINGS);
        }
        saveSignal(signal, false);
    }

    public void sendOverViewSignal(int tabCount, boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.OVERVIEW);
            signal.put(TelemetryKeys.OPEN_TAB_COUNT, tabCount);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendOverflowMenuSignal(boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.MAIN_MENU);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
            timings.setOverFlowMenuStartTime();
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendOverflowMenuHideSignal(boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.MAIN_MENU);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.HIDE);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.SHOW_DURATION, timings.getOverFlowMenuUseTime());
        } catch (JSONException e) {
            logError(TelemetryKeys.MAIN_MENU);
        }
        saveSignal(signal, false);
    }

    public void sendClearUrlBarSignal(boolean isIncognito, int urlLength, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.DELETE);
            signal.put(TelemetryKeys.CHAR_COUNT, urlLength);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendMainMenuSignal(String target, boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.MAIN_MENU);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.MAIN_MENU);
        }
        saveSignal(signal, false);
    }

    public void sendLongPressSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.WEB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.LONGPRESS);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.WEB);
        }
        saveSignal(signal, false);
    }

    public void sendControlCenterOpenSignal(boolean isIncognito, int trackerCount) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.CONTROL_CENTER);
            signal.put(TelemetryKeys.TRACKER_COUNT, trackerCount);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendCCCompanyInfoSignal(int index, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ATTRACK);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.INFO_COMPANY);
            signal.put(TelemetryKeys.INDEX, index);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.ATTRACK);
        }
        saveSignal(signal, false);
    }

    public void sendAntiPhisingShowSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ANTI_PHISHING);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
        } catch (JSONException e) {
            logError(TelemetryKeys.ANTI_PHISHING);
        }
        saveSignal(signal, false);
    }

    public void sendAntiPhisingSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ANTI_PHISHING);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.ANTI_PHISHING);
        }
        saveSignal(signal, false);
    }

    public void sendOverviewPageChangedSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendAttrackShowCaseSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.ATTRACK);
            signal.put(TelemetryKeys.VERSION, OnBoardingHelper.ONBOARDING_VERSION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.SHOW_COUNT, "1");
        } catch (JSONException e) {
            logError(TelemetryKeys.ONBOARDING);
        }
        saveSignal(signal, false);
    }

    public void sendCardsShowCaseSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.CARDS);
            signal.put(TelemetryKeys.VERSION, OnBoardingHelper.ONBOARDING_VERSION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.SHOW_COUNT, "1");
        } catch (JSONException e) {
            logError(TelemetryKeys.ONBOARDING);
        }
        saveSignal(signal, false);
    }

    public void sendShowCaseDoneSignal(String view, long duration) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.VERSION, OnBoardingHelper.ONBOARDING_VERSION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.CONFIRM);
            signal.put(TelemetryKeys.SHOW_DURATION, duration);
        } catch (JSONException e) {
            logError(TelemetryKeys.ONBOARDING);
        }
        saveSignal(signal, false);
    }

    public void sendKeyboardSignal(boolean isShown, boolean isIncognito, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.KEYBOARD);
            signal.put(TelemetryKeys.VIEW, view);
            signal.put(TelemetryKeys.ACTION, isShown ? TelemetryKeys.SHOW : TelemetryKeys.HIDE);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
        } catch (JSONException e) {
            logError(TelemetryKeys.KEYBOARD);
        }
        saveSignal(signal, false);
    }

    public void sendLinkDialogSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONTEXT_MENU);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.LINK);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONTEXT_MENU);
        }
        saveSignal(signal, false);
    }

    public void sendCCTabSignal(String currentPage) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONTROL_CENTER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, currentPage);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONTROL_CENTER);
        }
        saveSignal(signal, false);
    }

    public void sendCCToggleSignal(boolean isEnabled, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONTROL_CENTER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.DOMAIN_SWITCH);
            signal.put(TelemetryKeys.STATE, isEnabled ? TelemetryKeys.ON : TelemetryKeys.OFF);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONTROL_CENTER);
        }
        saveSignal(signal, false);
    }

    public void sendLearnMoreClickSignal(String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONTROL_CENTER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.LEARN_MORE);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONTROL_CENTER);
        }
        saveSignal(signal, false);
    }

    public void sendCCOkSignal(String okOrActivate, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONTROL_CENTER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, okOrActivate);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONTROL_CENTER);
        }
        saveSignal(signal, false);
    }

    /* We removed this due to privacy
    public void sendFBInstallSignal(String campaignName) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.FB_INSTALL);
            signal.put(TelemetryKeys.CAMPAIGN_NAME, campaignName);
        } catch (JSONException e) {
            logError(TelemetryKeys.ACTIVITY);
        }
        //TODO: Remove this for production version, for debugging purpose in beta only
        Log.v(TELEMETRY_TAG, signal.toString());
        saveSignal(signal, false);
    }
    */

    public void sendTopsitesClickSignal(int index, int count) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.HOME);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.TOPSITE);
            signal.put(TelemetryKeys.INDEX, index);
            signal.put(TelemetryKeys.TOPSITE_COUNT, count);
        } catch (JSONException e) {
            logError(TelemetryKeys.HOME);
        }
        saveSignal(signal, false);
    }

    public void sendTopnewsClickSignal(int index, String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.HOME);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.INDEX, index);
        } catch (JSONException e) {
            logError(TelemetryKeys.HOME);
        }
        saveSignal(signal, false);
    }

    public void sendFreshtabShowTelemetry(int topsitesCount, int topnewsCount, int breakingNewsCount,
                                          int localNewsCount, int availableTopNewsCount, String newsVersion) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.HOME);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.BREAKING_NEWS_COUNT, breakingNewsCount);
            signal.put(TelemetryKeys.TOPNEWS_COUNT, topnewsCount);
            signal.put(TelemetryKeys.TOPSITE_COUNT, topsitesCount);
            signal.put(TelemetryKeys.LOCALNEWS_COUNT, localNewsCount);
            signal.put(TelemetryKeys.AVAILABLE_TOP_NEWS_COUNT, availableTopNewsCount);
            signal.put(TelemetryKeys.NEWS_VERSION, newsVersion);
            signal.put(TelemetryKeys.IS_TOPSITES_ON, preferenceManager.shouldShowTopSites());
            signal.put(TelemetryKeys.IS_NEWS_ON, preferenceManager.shouldShowNews());

        } catch (JSONException e) {
            logError(TelemetryKeys.HOME);
        }
        saveSignal(signal, false);
    }

    public void sendQuerySuggestionShowSignal(int available, int shown) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.QUERY_SUGGESTIONS);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.SUGGESTION_AVAILABLE_COUNT, available);
            signal.put(TelemetryKeys.SUGGESTION_SHOWN_COUNT, shown);
        } catch (JSONException e) {
            logError(TelemetryKeys.QUERY_SUGGESTIONS);
        }
        saveSignal(signal, false);
    }

    public void sendQuerySuggestionClickSignal(int index) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.QUERY_SUGGESTIONS);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.INDEX, index);
        } catch (JSONException e) {
            logError(TelemetryKeys.QUERY_SUGGESTIONS);
        }
        saveSignal(signal, false);
    }


    public void sendConnectSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.START);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }


    public void sendConnectHideSignal(long duration, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.HIDE);
            signal.put(TelemetryKeys.SHOW_DURATION, duration);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }

    public void sendConnectShowSignal(int totalDeviceCount, int connectedDeviceCount) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.DEVICE_COUNT, totalDeviceCount);
            signal.put(TelemetryKeys.CONNECTION_COUNT, connectedDeviceCount);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.START);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }

    public void sendConnectScanSignal(long time) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.CONFIRM);
            signal.put(TelemetryKeys.SHOW_DURATION, time);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.SCAN_INTRO);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }

    public void sendConnectBackSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.BACK);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }

    public void sendConnectPairingSignal(long duration, boolean success) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CONNECT);
            signal.put(TelemetryKeys.CONNECT_DURATION, duration);
            signal.put(TelemetryKeys.IS_SUCCESS, success);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.START);
        } catch (JSONException e) {
            logError(TelemetryKeys.CONNECT);
        }
        saveSignal(signal, false);
    }

    public void sendYTIconVisibleSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.VIDEO_DOWNLOADER);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendYTIconClickedSignal(boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.VIDEO_DOWNLOADER);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.WEB);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabShowSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.CONNECTIONS);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabDevicePickerCancelledSignal(int devicesNo, long duration) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CANCEL);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.BACKGROUND);
            signal.put(TelemetryKeys.CONNECTION_COUNT, devicesNo);
            signal.put(TelemetryKeys.SHOW_DURATION, duration);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.CONNECTIONS);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabDevicePickerClickSignal(int index, int devicesNo, long duration) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.CONNECTION);
            signal.put(TelemetryKeys.INDEX, index);
            signal.put(TelemetryKeys.CONNECTION_COUNT, devicesNo);
            signal.put(TelemetryKeys.SHOW_DURATION, duration);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.CONNECTIONS);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabErrorSignal(SendTabErrorTypes errorType) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.VIEW,
                    errorType == SendTabErrorTypes.NO_CONNECTION_ERROR ?
                            TelemetryKeys.NO_CONNECTION_MESSAGE :
                            TelemetryKeys.SEND_ERROR_MESSAGE);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabErrorClickSignal(SendTabErrorTypes errorType, String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.VIEW,
                    errorType == SendTabErrorTypes.NO_CONNECTION_ERROR ?
                            TelemetryKeys.NO_CONNECTION_MESSAGE :
                            TelemetryKeys.SEND_ERROR_MESSAGE);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }
    public void sendSendTabErrorCancelSignal(SendTabErrorTypes errorType, long duration) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CANCEL);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.BACKGROUND);
            signal.put(TelemetryKeys.DURATION, duration);
            signal.put(TelemetryKeys.VIEW,
                    errorType == SendTabErrorTypes.NO_CONNECTION_ERROR ?
                            TelemetryKeys.NO_CONNECTION_MESSAGE :
                            TelemetryKeys.SEND_ERROR_MESSAGE);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSendTabSuccessSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SEND_TAB);
            signal.put(TelemetryKeys.IS_SUCCESS, true);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendSubscriptionSignal(boolean confirmed) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.SUBSCRIPTION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, confirmed ? TelemetryKeys.CONFIRM : TelemetryKeys.CANCEL);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.SUBSCRIPTION_ALERT);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.SUBSCRIPTION);
        }
    }

    public void sendMoreNewsSignal(boolean isNewsExpanded) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.HOME);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, isNewsExpanded ? TelemetryKeys.SHOW_MORE : TelemetryKeys.SHOW_LESS);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.NEWS);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    public void sendBackIconPressedSignal(boolean mIsIncognito, boolean freshTabVisible) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.COLLAPSE);
            signal.put(TelemetryKeys.IS_FORGET, mIsIncognito);
            signal.put(TelemetryKeys.VIEW, freshTabVisible ? TelemetryKeys.HOME : TelemetryKeys.CARDS);
        } catch (JSONException e) {
            logError(TelemetryKeys.SEND_TAB);
        }
        saveSignal(signal, false);
    }

    private void logError(String type) {
        Log.e(TELEMETRY_TAG, "Error sending telemetry for " + type);
    }
    /**
     * Reset counter for the internet navigation signal.
     * Currently it is reset when the user clicks on a link from the search results(cards)
     * @param urlLength length of the url of the current web page
     */
    public void resetNavigationVariables(int urlLength) {
        timings.setPageStartTime();
        forwardStep = 0;
        this.urlLength = urlLength;
    }

    /**
     * Reset counter for the back navigation signal
     * @param urlLength length of the url of the current web page
     */
    public void resetBackNavigationVariables(int urlLength) {
        timings.setPageStartTime();
        backStep = 1;
        this.urlLength = urlLength;
    }

    private synchronized void saveSignal(JSONObject signal, boolean forcePush) {
        addIdentifiers(signal);
        mSignalCache.put(signal);
        if (BuildConfig.DEBUG) {
            try {
                signal.put("cindex", mSignalCache.length());
            } catch (JSONException e) {
                // NOP
            }
            Log.v(TELEMETRY_TAG, signal.toString());
        }
        final boolean shouldSend = (forcePush || mSignalCache.length() > BATCH_SIZE);
        if (shouldSend) {
            sendCachedSignals();
        }
    }

    private synchronized void sendCachedSignals() {
        if (!preferenceManager.isSendUsageDataEnabled()) {
            // Do not send any signal, just flush out the cached ones
            mSignalCache = new JSONArray();
            return;
        }
        final JSONArray cache = mSignalCache;
        if(BuildConfig.DEBUG){
            final JSONObject msg = new JSONObject();
            try {
                msg.put("csize", mSignalCache.length());
                Log.v(TELEMETRY_TAG, msg.toString());
            } catch (JSONException e) {
                // NOP
            }
        }
        mSignalCache = new JSONArray();
        final TelemetrySender sender = new TelemetrySender(cache, context);
        executorService.execute(sender);
    }

    /**
     * Posts the telemetry signal sent by the extension, to the logger
     * @param signal Telemetry signal by the extension
     */
    public void saveExtSignal(JSONObject signal) {
        if(signal.length() != 0) {
            saveSignal(signal, false);
        }
    }

    //adds session id. timestamp, sequence number to the signals
    private void addIdentifiers(JSONObject signal) {
        int telemetrySequence = preferenceManager.getTelemetrySequence();
        try {
            signal.put(TelemetryKeys.SESSION, preferenceManager.getSessionId());
            signal.put(TelemetryKeys.TIME_STAMP, getUnixTimeStamp());
            signal.put(TelemetryKeys.TELEMETRY_SEQUENCE, telemetrySequence);
        } catch (JSONException e) {
            Log.e(TELEMETRY_TAG, "Error");
        }
        preferenceManager.setTelemetrySequence(telemetrySequence);
    }

    /**
     * Generates a SessionID as per the CLIQZ standard
     * @see <a href="https://github.com/cliqz/navigation-extension/wiki/Logging#session-id-format</a>
     * @return A newly generated SessionID
     */
    public String generateSessionID() {
        String randomAlphaNumericString = generateRandomString(18, TelemetryKeys.ALPHA_NUMERIC_SPACE);
        String randomNumericString = generateRandomString(6, TelemetryKeys.NUMERIC_SPACE);
        String days = Long.toString(getUnixTimeStamp() / 86400000);
        return randomAlphaNumericString + randomNumericString + "|" + days + "|" + BuildConfig.TELEMETRY_CHANNEL;
    }

    //Returns a random string of length 'length' using characters from the given 'space'
    private String generateRandomString(int length, String space) {
        final StringBuilder builder = new StringBuilder(length);
        for(int i=0; i < length; i++ ) {
            builder.append(space.charAt((int)Math.floor(Math.random() * space.length())));
        }
        return builder.toString();
    }

    //Returns the current time in milliseconds since January 1, 1970 midningt UTC.
    //This returns the time in UTC regardless of the timezone of the system
    private long getUnixTimeStamp() {
        return (long)Math.floor(System.currentTimeMillis());
    }

    //returns current language of the device
    private String getLanguage() {
        String language = Locale.getDefault().getLanguage()+"-"+Locale.getDefault().getCountry();
        language = language.replaceAll("_","-");
        return language;
    }

    private String getDefaultSearchEngine() {
        return preferenceManager.getSearchChoice().engineName;
    }

    private String getNetworkState() {
        ConnectivityManager manager = (ConnectivityManager)
                context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = manager != null ? manager.getActiveNetworkInfo() : null;
        boolean isConnected = networkInfo != null && networkInfo.isConnected();
        if(isConnected) {
            if(networkInfo.getType() == ConnectivityManager.TYPE_WIFI) {
                return "Wifi";
            } else if(networkInfo.getType() == ConnectivityManager.TYPE_MOBILE) {
                return "WWAN";
            } else if(networkInfo.getType() == ConnectivityManager.TYPE_WIMAX) {
                return "WIMAX";
            } else if(networkInfo.getType() == ConnectivityManager.TYPE_ETHERNET) {
                return "ETHERNET";
            } else {
                return "Connected";
            }
        } else {
            return "Disconnected";
        }
    }

    //Memory(RAM) being used by the application in MBs
    private int getMemoryUsage() {
        final ActivityManager activityManager =
                (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        if (activityManager == null) {
            return 0;
        }
        final int pids[] = new int[] { android.os.Process.myPid() };
        final Debug.MemoryInfo[] memoryInfoArray = activityManager.getProcessMemoryInfo(pids);
        return memoryInfoArray[0].getTotalPss() / 1024;
    }

    public void sendNodificationDisabledSignal(String where) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, where);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.SUBSCRIPTION_ERROR);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.SUBSCRIPTION);
        }
        saveSignal(signal, false);
    }

    public void sendOrientationSignal(String orientation, String view) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.ROTATE);
            signal.put(TelemetryKeys.STATE, orientation);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            logError(TelemetryKeys.ROTATE);
        }
        saveSignal(signal, false);
    }

    /**
     * QuickAccessBar signal. Args length must be at least 1, args[0] is the always the action,
     * args[1], if present, must be the target.
     *
     * @param action non-null action string
     * @param target nullable action target
     * @param view freshtab view state (home or cards)
     */
    public void sendQuickAccessBarSignal(@NonNull String action, @Nullable String target,
                                         @NonNull String view) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.QUICK_ACCESS_BAR);
            signal.put(TelemetryKeys.ACTION, action);
            if (target != null) {
                signal.put(TelemetryKeys.TARGET, target);
            }
            signal.put(TelemetryKeys.VIEW, view);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.QUICK_ACCESS_BAR);
        }
    }

    public void sendOverviewPageVisibilitySignal(String pageName, long duration, boolean visible) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, visible ? TelemetryKeys.SHOW : TelemetryKeys.HIDE);
            signal.put(TelemetryKeys.VIEW, pageName);
            if (!visible) {
                signal.put(TelemetryKeys.DURATION, duration);
            }
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.TOOLBAR);
        }
    }

    public void sendOffrzSignal(String action, String target) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.OFFRZ);
            signal.put(TelemetryKeys.ACTION, action);
            signal.put(TelemetryKeys.TARGET, target);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.OFFRZ);
        }
    }

    public void sendOnboardingSignal(String action, String view) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.ACTION, action);
            signal.put(TelemetryKeys.VIEW, view);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.OFFRZ);
        }
    }

    public void sendOnboardingSignal(String action, String target, String view) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.ACTION, action);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.VIEW, view);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.OFFRZ);
        }
    }

    public void sendDefaultBrowserSignal(String target) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.DEFAULT_BROWSER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.DEFAULT_BROWSER);
        }
    }

    public void sendDefaultBrowserCancelSignal(long duration) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.DEFAULT_BROWSER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.SHOW_DURATION, duration);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.DEFAULT_BROWSER);
        }
    }

    public void sendPasswordDialogShowSignal() {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.PASSWORD_MANAGER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.WEB);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.PASSWORD_MANAGER);
        }
    }

    public void sendPasswordDialogClickSignal(String target) {
        final JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.PASSWORD_MANAGER);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.WEB);
            saveSignal(signal, false);
        } catch (JSONException e) {
            logError(TelemetryKeys.PASSWORD_MANAGER);
        }
    }

    //receiver listening to changes in battery levels
    private class BatteryInfoReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(final Context context, Intent intent) {
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, 0);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            batteryLevel = (level*100)/scale;
        }
    }

    //receiver listening to changes in network state
    private class NetworkChangeReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            //Prevent sending a signal when the receiver is registered
            if (isFirstNetworkSignal) {
                isFirstNetworkSignal = false;
                return;
            }
            //check to make sure the app is in foreground
            if(timings.getAppUsageTime() < 0) {
                sendNetworkStatus();
            }
        }
    }

    private boolean isLocationGranted() {
        final String permission = Manifest.permission.ACCESS_FINE_LOCATION;
        final int res = context.checkCallingOrSelfPermission(permission);
        return (res == PackageManager.PERMISSION_GRANTED);
    }
}
