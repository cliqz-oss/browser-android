package com.cliqz.browser.utils;

import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Debug;
import android.util.Log;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.OnBoardingHelper;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * Created by Ravjit on 17/11/15.
 */
public class Telemetry {

    private static final int BATCH_SIZE = 50;
    private JSONArray mSignalCache = new JSONArray();

    @Inject
    PreferenceManager mPreferenceManager;

    @Inject
    HistoryDatabase mHistoryDatabase;

    @Inject
    Timings timings;

    private final ExecutorService executorService = Executors.newSingleThreadExecutor();

    private String currentNetwork, currentLayer;
    private String mExtensionVersion;
    private Context context;
    private int batteryLevel, forwardStep, backStep, urlLength, previousPage;
    private boolean isFirstNetworkSignal = true;
    public boolean backPressed;
    public boolean showingCards;


    public Telemetry(Context context) {
        BrowserApp.getAppComponent().inject(this);
        this.context = context;
        batteryLevel = -1;
        context.registerReceiver(mBatteryInfoReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        context.registerReceiver(mNetworkChangeReceiver, new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));
        mExtensionVersion = getExtensionVersion();
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
            if (action == TelemetryKeys.INSTALL) {
                signal.put(TelemetryKeys.ADVERT_ID, mPreferenceManager.getAdvertID());
                signal.put(TelemetryKeys.DISTRIBUTION, mPreferenceManager.getDistribution());
                signal.put(TelemetryKeys.ENCODING_EXCEPTION, mPreferenceManager.getDistributionException());
                signal.put(TelemetryKeys.REFERRER_URL, mPreferenceManager.getReferrerUrl());
                signal.put(TelemetryKeys.VERSION_DIST, BuildConfig.VERSION_NAME);
                sendEnvironmentSignal(true);
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the app is closed
     * @param action One of the two: "close" or "kill"
     * @param context The screen which is visible when the this signal is sent.
     */
    private void sendAppCloseSignal(String action, String context) {
        JSONObject signal = new JSONObject(); ;
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
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar gets focus
     * @param view The screen which is visible when the signal is sent. (Web or Cards)
     */
    public void sendURLBarFocusSignal(Boolean isIncognito, String view) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.FOCUS);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.SEARCH);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar looses focus
     */
    public void sendURLBarBlurSignal(boolean isIncognito, String view) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.BLUR);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.SEARCH);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            e.printStackTrace();
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
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, action);
            signal.put(TelemetryKeys.LENGTH, length);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the user pastes something in the search bar
     * @param length Length of the text pasted in the search bar
     */
    public void sendPasteSignal(int length) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.PASTE);
            signal.put(TelemetryKeys.LENGTH, length);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a signal for showing an onboarding page
     * @param currentPage Position/Page number of the onboarding-screen which is shown
     */
    public void sendOnBoardingShowSignal(int currentPage) {
        previousPage = currentPage;
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
            signal.put(TelemetryKeys.ACTION_TARGET, currentPage);
            signal.put(TelemetryKeys.PRODUCT, TelemetryKeys.ANDROID);
            signal.put(TelemetryKeys.VERSION, TelemetryKeys.ONBOARDING_VERSION);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a signal for hiding/closing an onboarding page
     * @param time Duration for which the onboarding page was shown
     */
    public void sendOnBoardingHideSignal(long time) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ONBOARDING);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.INTRO);
            signal.put(TelemetryKeys.VERSION, OnBoardingHelper.ONBOARDING_VERSION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.NEXT);
            signal.put(TelemetryKeys.SHOW_DURATION, time);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        Log.d("Onboarding", signal.toString());
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the user switches between the past, present and future layers
     * @param newLayer The layer visible after switching/changing fragments
     */
    public void sendLayerChangeSignal(String newLayer) {
        if(currentLayer == null || currentLayer.isEmpty()) {
            timings.setLayerStartTime();
            currentLayer = newLayer;
        } else {
            JSONObject signal = new JSONObject(); ;
            try {
                signal.put(TelemetryKeys.TYPE, TelemetryKeys.ACTIVITY);
                signal.put(TelemetryKeys.ACTION, TelemetryKeys.LAYER_CHANGE);
                signal.put(TelemetryKeys.CURRENT_LAYER, currentLayer);
                signal.put(TelemetryKeys.NEXT_LAYER, newLayer);
                signal.put(TelemetryKeys.DISPLAY_TIME, timings.getLayerDisplayTime());
            } catch (JSONException e) {
                e.printStackTrace();
            }
            timings.setLayerStartTime();
            currentLayer = newLayer;
            saveSignal(signal, false);
        }
    }

    /**
     *Sends a telemetry signal about the environment when the app starts.
     *This signal is sent at most once an hour unless force sent.
     * @param forceSend If true the method will not respect the 1 hour rule for sending the signal
     */
    private void sendEnvironmentSignal(boolean forceSend) {
        final long oneHour = 3600000;
        final long oneDay = 86400000;
        long days = 0;
        final long timeSinceLastSingal = timings.getTimeSinceLastEnvSignal();
        if(timeSinceLastSingal < oneHour && !forceSend) {
            return;
        }
        timings.setLastEnvSingalTime();
        final int historySize = mHistoryDatabase.getHistoryItemsCount();
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ENVIRONMENT);
            signal.put(TelemetryKeys.DEVICE, Build.MODEL);
            signal.put(TelemetryKeys.LANGUAGE, getLanguage());
            signal.put(TelemetryKeys.VERSION, mExtensionVersion);
            signal.put(TelemetryKeys.VERSION_DIST, BuildConfig.VERSION_NAME);
            signal.put(TelemetryKeys.VERSION_HOST, BuildConfig.LIGHTNING_VERSION_NAME);
            signal.put(TelemetryKeys.VERSION_OS, Build.VERSION.SDK_INT);
            signal.put(TelemetryKeys.OS_VERSION, Integer.toString(Build.VERSION.SDK_INT));
            signal.put(TelemetryKeys.DEFAULT_SEARCH_ENGINE, getDefaultSearchEngine());
            signal.put(TelemetryKeys.HISTORY_URLS, historySize);
            signal.put(TelemetryKeys.NEWS_NOTIFICATION, mPreferenceManager.getNewsNotificationEnabled());
            signal.put(TelemetryKeys.DISTRIBUTION, mPreferenceManager.getDistribution());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        if(historySize > 0) {
            long firstItemTime = mHistoryDatabase.getFirstHistoryItemTimestamp();
            days = (getUnixTimeStamp() - firstItemTime) / oneDay;
        }
        try {
            signal.put(TelemetryKeys.HISTORY_DAYS, days);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    //Send a telemetry signal of the network state, when the app closes and when the network changes
    private void sendNetworkStatus() {
        long duration = timings.getNetworkUsageTime();
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NETWORK_STATUS);
            signal.put(TelemetryKeys.NETWORK, currentNetwork);
            signal.put(TelemetryKeys.DURATION, duration);
        } catch (JSONException e) {
            e.printStackTrace();
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
        currentLayer = "";
        if (closeOrKill == TelemetryKeys.CLOSE) {
            sendNetworkStatus();
        }
        sendAppCloseSignal(closeOrKill, context);
    }

    /**
     * Send telemetry signal when the user navigates deeper into the web-page
     * @param urlLength length of the url of the new page
     */
    public void sendNavigationSignal(int urlLength) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NAVIGATION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.LOCATION_CHANGE);
            signal.put(TelemetryKeys.STEP, forwardStep);
            signal.put(TelemetryKeys.URL_LENGTH, this.urlLength);
            signal.put(TelemetryKeys.DISPLAY_TIME, timings.getPageDisplayTime());
        } catch (JSONException e) {
            e.printStackTrace();
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
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NAVIGATION);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.BACK);
            signal.put(TelemetryKeys.STEP, this.backStep);
            signal.put(TelemetryKeys.URL_LENGTH, this.urlLength);
            signal.put(TelemetryKeys.DISPLAY_TIME, timings.getPageDisplayTime());
            signal.put(TelemetryKeys.CURRENT_CONTEXT, currentContext);
            signal.put(TelemetryKeys.NEXT_CONTEXT, nextContext);
        } catch (JSONException e) {
            e.printStackTrace();
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
        final boolean innerLink;
        if(isAutocompleted) {
            innerLink = true;
        } else {
            innerLink = false;
        }
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
            signal.put(TelemetryKeys.INNER_LINK, innerLink);
            signal.put(TelemetryKeys.VERSION, BuildConfig.VERSION_NAME);
            if(isAutocompleted) {
                signal.put(TelemetryKeys.AUTOCOMPLETED, "url");
                signal.put(TelemetryKeys.AUTOCOMPLETED_LENGTH, autoCompleteLength);
            }
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send telemetry signal when user receives, opens, enables, disables or dismisses news notification
     * @param action type of signal
     */
    public void sendNewsNotificationSignal(String action) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.NEWS_NOTIFICATION);
            signal.put(TelemetryKeys.ACTION, action);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
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
            signal.put(TelemetryKeys.COUNT, count);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send signal whenever a navigation drawer is opened
     * @param count number of open tabs
     */
    public void sendTabsMenuOpen(int count) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TABS);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.OPEN_MENU);
            signal.put(TelemetryKeys.TAB_COUNT, count);
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendVideoDownloadSignal(boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.MAIN_MENU);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.DOWNLOAD_VIDEO);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, TelemetryKeys.WEB);
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendOverViewSignal(int tabCount, boolean isIncognito, CliqzBrowserState.Mode mode) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.OVERVIEW);
            signal.put(TelemetryKeys.OPEN_TABS, tabCount);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, mode == CliqzBrowserState.Mode.SEARCH ? TelemetryKeys.CARDS : TelemetryKeys.WEB);
        } catch (JSONException e) {
            e.printStackTrace();
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
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendCLearUrlBarSignal(boolean isIncognito, int urlLength, String view) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.DELETE);
            signal.put(TelemetryKeys.CHAR_COUNT, urlLength);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
            signal.put(TelemetryKeys.VIEW, view);
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendAntiTrackingOpenSignal(boolean isIncognito, int trackerCount) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.ATTRACK);
            signal.put(TelemetryKeys.TRACKER_COUNT, trackerCount);
            signal.put(TelemetryKeys.IS_FORGET, isIncognito);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendAntiTrackingHelpSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ATTRACK);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.HELP);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendAntiTrackingInfoSignal(int index) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ATTRACK);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, TelemetryKeys.INFO_COMPANY);
            signal.put(TelemetryKeys.INDEX, index);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendAntiPhisingShowSignal() {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.ANTI_PHISHING);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.SHOW);
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendPagerChangeSignal(String target) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, TelemetryKeys.TOOLBAR);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.CLICK);
            signal.put(TelemetryKeys.TARGET, target);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    public void sendPageHideSignal(String type, long time) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(TelemetryKeys.TYPE, type);
            signal.put(TelemetryKeys.ACTION, TelemetryKeys.HIDE);
            signal.put(TelemetryKeys.SHOW_DURATION, time);
        } catch (JSONException e) {
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
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
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Reset counter for the internet navigation signal.
     * Currently it is reset when the user clicks on a link from the search results(cards)
     * @param urlLength length of the url of the current web page
     */
    public void resetNavigationVariables(int urlLength) {
        timings.setPageStartTime();
        forwardStep = 1;
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
        if (forcePush || mSignalCache.length() > BATCH_SIZE) {
            final JSONArray cache = mSignalCache;
            mSignalCache = new JSONArray();
            final TelemetrySender sender = new TelemetrySender(cache, context);
            executorService.execute(sender);
        }
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

    //Helper function to convert a JSONObject to HashMap
    private JSONObject toMap(JSONObject object) throws JSONException {
        JSONObject map = new JSONObject();
        Iterator<String> keysItr = object.keys();
        while(keysItr.hasNext()) {
            String key = keysItr.next();
            Object value = object.get(key);
            if(value.equals(null)) {
                value = value.toString();
            }
            if(value instanceof JSONArray) {
                value = toList((JSONArray) value);
            }
            else if(value instanceof JSONObject) {
                value = toMap((JSONObject) value);
            }
            map.put(key, value);
        }
        return map;
    }

    //Helper function to convert a JSONArray to a list
    private List<Object> toList(JSONArray array) throws JSONException {
        List<Object> list = new ArrayList<>();
        for(int i = 0; i < array.length(); i++) {
            Object value = array.get(i);
            if(value.equals(null)) {
                value = value.toString();
            }
            if(value instanceof JSONArray) {
                value = toList((JSONArray) value);
            }
            else if(value instanceof JSONObject) {
                value = toMap((JSONObject) value);
            }
            list.add(value);
        }
        return list;
    }

    //adds session id. timestamp, sequence number to the signals
    private void addIdentifiers(JSONObject signal) {
        int telemetrySequence = mPreferenceManager.getTelemetrySequence();
        try {
            signal.put(TelemetryKeys.SESSION, mPreferenceManager.getSessionId());
            signal.put(TelemetryKeys.TIME_STAMP, getUnixTimeStamp());
            signal.put(TelemetryKeys.TELEMETRY_SEQUENCE, telemetrySequence);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        mPreferenceManager.setTelemetrySequence(telemetrySequence);
    }

    /*
    //adds session id. timestamp, sequence number to the signals
    private void addIdentifiers(JSONObject signal) {
        int telemetrySequence = mPreferenceManager.getTelemetrySequence();
        signal.put(TelemetryKeys.SESSION, mPreferenceManager.getSessionId());
        signal.put(TelemetryKeys.TIME_STAMP, getUnixTimeStamp());
        signal.put(TelemetryKeys.TELEMETRY_SEQUENCE, telemetrySequence);
        mPreferenceManager.setTelemetrySequence(telemetrySequence);
    }
    */

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
        String randomString = "";
        for(int i=0; i < length; i++ ) {
            randomString += space.charAt((int)Math.floor(Math.random() * space.length()));
        }
        return randomString;
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
        return mPreferenceManager.getSearchChoice().engineName;
    }

    private String getNetworkState() {
        ConnectivityManager manager = (ConnectivityManager)
                context.getSystemService(context.CONNECTIVITY_SERVICE);
        NetworkInfo networkInfo = manager.getActiveNetworkInfo();
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
        ActivityManager activityManager = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
        int currentPid = android.os.Process.myPid();
        int pids[] = new int[1];
        pids[0] = currentPid;
        Debug.MemoryInfo[] memoryInfoArray = activityManager.getProcessMemoryInfo(pids);
        for (Debug.MemoryInfo pidMemoryInfo : memoryInfoArray) {
            return pidMemoryInfo.getTotalPss() / 1024;
        }
        return -1;
    }

    private String getExtensionVersion() {
        String extensionVersion = "";
        try {
            final InputStream inputStream = context.getAssets().open("search/cliqz.json");
            final byte[] buffer = new byte[inputStream.available()];
            inputStream.read(buffer);
            inputStream.close();
            final String contents = new String(buffer, "UTF-8");
            final JSONObject jsonObject = new JSONObject(contents);
            extensionVersion = jsonObject.getString("EXTENSION_VERSION");
        } catch (IOException e) {
            e.printStackTrace();
        } catch (JSONException e) {
            e.printStackTrace();
        } finally {
            return extensionVersion;
        }
    }

    //receiver listening to changes in battery levels
    private BroadcastReceiver mBatteryInfoReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(final Context context, Intent intent) {
            int level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, 0);
            int scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            int percent = (level*100)/scale;
            batteryLevel = percent;
        }
    };

    //receiver listening to changes in network state
    private BroadcastReceiver mNetworkChangeReceiver = new BroadcastReceiver() {
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
    };

}