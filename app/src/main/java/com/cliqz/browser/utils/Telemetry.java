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

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.app.BrowserApp;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

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

    public Telemetry(Context context) {
        BrowserApp.getAppComponent().inject(this);
        this.context = context;
        batteryLevel = -1;
        context.registerReceiver(mBatteryInfoReceiver, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        context.registerReceiver(mNetworkChangeReceiver, new IntentFilter(ConnectivityManager.CONNECTIVITY_ACTION));
    }
    
    private static class Key {

        private static final String ALPHA_NUMERIC_SPACE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        private static final String NUMERIC_SPACE = "0123456789";
        private static final String SESSION = "session";
        private static final String TIME_STAMP = "ts";
        private static final String TELEMETRY_SEQUENCE = "seq";
        private static final String ACTION = "action";
        private static final String TYPE = "type";
        private static final String VERSION = "version";
        private static final String OS_VERSION = "os_version";
        private static final String DEVICE = "device";
        private static final String LANGUAGE = "language";
        private static final String DEFAULT_SEARCH_ENGINE = "defaultSearchEngine";
        private static final String HISTORY_URLS = "history_urls";
        private static final String HISTORY_DAYS = "history_days";
        private static final String PREFERENCES = "prefs";
        private static final String NETWORK = "network";
        private static final String BATTERY = "battery";
        private static final String CONTEXT = "context";
        private static final String MEMORY = "memory";
        private static final String TIME_USED = "time_used";
        private static final String LENGTH = "key_length";
        private static final String ACTION_TARGET = "action_target";
        private static final String DISPLAY_TIME = "display_time";
        private static final String DURATION = "duration";
        private static final String ACTIVITY = "activity";
        private static final String ENVIRONMENT = "environment";
        private static final String ONBOARDING = "onboarding";
        private static final String CURRENT_LAYER = "current_layer";
        private static final String NEXT_LAYER = "next_layer";
        private static final String STEP = "step";
        private static final String URL_LENGTH = "url_length";
        private static final String HAS_SCROLLED = "has_scrolled";
        private static final String NAVIGATION = "navigation";
        private static final String CURRENT_CONTEXT = "current_context";
        private static final String NEXT_CONTEXT = "next_context";
        private static final String QUERY_LENGTH = "query_length";
        private static final String AUTOCOMPLETED_LENGTH = "autocompleted_length";
        private static final String CURRENT_POSITION = "current_position";
        private static final String INNER_LINK = "inner_link";
        private static final String EXTRA = "extra";
        private static final String SEARCH = "search";
        private static final String HAS_IMAGE = "has_image";
        private static final String CLUSTERING_OVERRIDE = "clustering_override";
        private static final String AUTOCOMPLETED = "autocompleted";
        private static final String NEW_TAB = "new_tab";
        private static final String REACTION_TIME = "reaction_time";
        private static final String URLBAR_TIME = "urlbar_time";
        private static final String POSITION_TYPE = "position_type";
        private static final String INBAR_URL = "inbar_url";
        private static final String INBAR_QUERY = "inbar_query";
        private static final String PRODUCT = "product";
        private static final String ANDROID = "cliqz_android";
        private static final String APP_STATE_CHANGE = "app_state_change";
        private static final String STATE = "state";
        private static final String ONBOARDING_VERSION = "1.0";
        private static final String SHARE = "share";
        private static final String TARGET_TYPE = "target_type";
        private static final String MAIN = "main";
        private static final String NEWS_NOTIFICATION = "news_notification";
        private static final String STARTUP_TYPE = "startup_type";
        private static final String STARTUP_TIME = "startup_time";
        private static final String TABS = "tabs";
        private static final String TAB_COUNT = "tab_count";
        private static final String TAB_INDEX = "tab_index";
        private static final String MODE = "mode";
        private static final String NORMAL = "normal";
        private static final String PRIVATE = "private";
        private static final String DISTRIBUTION = "distribution";
        private static final String ADVERT_ID = "advert_id";
    }

    public static class Action {

        public static final String INSTALL = "install";
        public static final String UPDATE = "update";
        public static final String URLBAR_FOCUS = "urlbar_focus";
        public static final String URLBAR_BLUR = "urlbar_blur";
        public static final String KEYSTROKE_DEL = "keystroke_del";
        public static final String PASTE = "paste";
        public static final String SHOW = "show";
        public static final String HIDE = "hide";
        public static final String NETWORK_STATUS = "network_status";
        public static final String OPEN = "open";
        public static final String CLOSE = "close";
        public static final String KILL = "kill";
        public static final String LAYER_CHANGE = "layer_change";
        public static final String LOCATION_CHANGE = "location_change";
        public static final String BACK = "back";
        public static final String RESULT_ENTER = "result_enter";
        public static final String CLICK = "click";
        public static final String ENABLE = "enable";
        public static final String DISABLE = "disable";
        public static final String RECEIVE = "receive";
        public static final String DISMISS = "dismiss";
        public static final String OPEN_MENU = "open_menu";
        public static final String NEW_TAB = "new_tab";
        public static final String OPEN_TAB = "open_tab";
        public static final String CLOSE_TAB = "close_tab";
    }

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
    private Context context;
    private int batteryLevel, forwardStep, backStep, urlLength, previousPage;

    public boolean backPressed;
    public boolean showingCards;

    /**
     * Sends a telemetry signal related to the application life cycle: install/update
     * @param action type of the signal: App install or App update
     */
    public void sendLifeCycleSignal(String action) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, action);
            if (action == Action.INSTALL) {
                signal.put(Key.ADVERT_ID, mPreferenceManager.getAdvertID());
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
            signal.put(Key.TYPE, Key.APP_STATE_CHANGE);
            signal.put(Key.STATE, action);
            signal.put(Key.NETWORK, getNetworkState());
            signal.put(Key.BATTERY, batteryLevel);
            signal.put(Key.MEMORY, getMemoryUsage());
            signal.put(Key.CONTEXT, context);
            if(action.equals(Action.CLOSE)) {
                signal.put(Key.TIME_USED, timings.getAppUsageTime());
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
            signal.put(Key.TYPE, Key.APP_STATE_CHANGE);
            signal.put(Key.STATE, Action.OPEN);
            signal.put(Key.NETWORK, getNetworkState());
            signal.put(Key.BATTERY, batteryLevel);
            signal.put(Key.CONTEXT, context);
            signal.put(Key.STARTUP_TYPE, startType);
            signal.put(Key.STARTUP_TIME, timings.getAppStartUpTime());
            signal.put(Key.MEMORY, getMemoryUsage());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar gets focus
     * @param context The screen which is visible when the signal is sent. (Web or Cards)
     */
    public void sendURLBarFocusSignal(String context) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, Action.URLBAR_FOCUS);
            signal.put(Key.CONTEXT, context);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send a telemetry signal when the url bar looses focus
     */
    public void sendURLBarBlurSignal() {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, Action.URLBAR_BLUR);
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
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, action);
            signal.put(Key.LENGTH, length);
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
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, Action.PASTE);
            signal.put(Key.LENGTH, length);
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
            signal.put(Key.TYPE, Key.ONBOARDING);
            signal.put(Key.ACTION, Action.SHOW);
            signal.put(Key.ACTION_TARGET, currentPage);
            signal.put(Key.PRODUCT, Key.ANDROID);
            signal.put(Key.VERSION, Key.ONBOARDING_VERSION);
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
            signal.put(Key.TYPE, Key.ONBOARDING);
            signal.put(Key.ACTION, Action.HIDE);
            signal.put(Key.ACTION_TARGET, previousPage);
            signal.put(Key.DISPLAY_TIME,time);
            signal.put(Key.PRODUCT, Key.ANDROID);
            signal.put(Key.VERSION, BuildConfig.VERSION_NAME);
        } catch (JSONException e) {
            e.printStackTrace();
        }
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
                signal.put(Key.TYPE, Key.ACTIVITY);
                signal.put(Key.ACTION, Action.LAYER_CHANGE);
                signal.put(Key.CURRENT_LAYER, currentLayer);
                signal.put(Key.NEXT_LAYER, newLayer);
                signal.put(Key.DISPLAY_TIME, timings.getLayerDisplayTime());
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
     *This signal is sent at most once an hour.
     */
    private void sendEnvironmentSignal() {
        long oneHour = 3600000;
        long oneDay = 86400000;
        long days = 0;
        long timeSinceLastSingal = timings.getTimeSinceLastEnvSignal();
        if(timeSinceLastSingal < oneHour) {
            return;
        }
        timings.setLastEnvSingalTime();
        final int historySize = mHistoryDatabase.getHistoryItemsCount();
        JSONObject signal = new JSONObject();
        try {
            signal.put(Key.TYPE, Key.ENVIRONMENT);
            signal.put(Key.DEVICE, Build.MODEL);
            signal.put(Key.LANGUAGE, getLanguage());
            signal.put(Key.VERSION, BuildConfig.VERSION_NAME);
            signal.put(Key.OS_VERSION, Integer.toString(Build.VERSION.SDK_INT));
            signal.put(Key.DEFAULT_SEARCH_ENGINE, getDefaultSearchEngine());
            signal.put(Key.HISTORY_URLS, historySize);
            signal.put(Key.NEWS_NOTIFICATION, mPreferenceManager.getNewsNotificationEnabled());
            signal.put(Key.DISTRIBUTION, mPreferenceManager.getReferrer());
        } catch (JSONException e) {
            e.printStackTrace();
        }
        if(historySize > 0) {
            long firstItemTime = mHistoryDatabase.getFirstHistoryItemTimestamp();
            days = (getUnixTimeStamp() - firstItemTime) / oneDay;
        }
        try {
            signal.put(Key.HISTORY_DAYS, days);
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
            signal.put(Key.TYPE, Action.NETWORK_STATUS);
            signal.put(Key.NETWORK, currentNetwork);
            signal.put(Key.DURATION, duration);
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
        sendEnvironmentSignal();
        sendAppStartupSignal(context, startType);
    }

    /**
     * Send telemetry signal when the app closes/goes to background
     * @param context the layer which is visible
     */
    public void sendClosingSignals(String closeOrKill, String context) {
        currentLayer = "";
        sendNetworkStatus();
        sendAppCloseSignal(closeOrKill, context);
    }

    /**
     * Send telemetry signal when the user navigates deeper into the web-page
     * @param urlLength length of the url of the new page
     */
    public void sendNavigationSignal(int urlLength) {
        JSONObject signal = new JSONObject(); ;
        try {
            signal.put(Key.TYPE, Key.NAVIGATION);
            signal.put(Key.ACTION, Action.LOCATION_CHANGE);
            signal.put(Key.STEP, forwardStep);
            signal.put(Key.URL_LENGTH, this.urlLength);
            signal.put(Key.DISPLAY_TIME, timings.getPageDisplayTime());
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
            signal.put(Key.TYPE, Key.NAVIGATION);
            signal.put(Key.ACTION, Action.BACK);
            signal.put(Key.STEP, this.backStep);
            signal.put(Key.URL_LENGTH, this.urlLength);
            signal.put(Key.DISPLAY_TIME, timings.getPageDisplayTime());
            signal.put(Key.CURRENT_CONTEXT, currentContext);
            signal.put(Key.NEXT_CONTEXT, nextContext);
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
                positionType.put(Key.INBAR_QUERY);
            } else {
                positionType.put(Key.INBAR_URL);
            }
            signal.put(Key.TYPE, Key.ACTIVITY);
            signal.put(Key.ACTION, Action.RESULT_ENTER);
            signal.put(Key.CURRENT_POSITION, -1);
            signal.put(Key.EXTRA, null);
            signal.put(Key.SEARCH, false);
            signal.put(Key.HAS_IMAGE, false);
            signal.put(Key.CLUSTERING_OVERRIDE, false);
            signal.put(Key.NEW_TAB, false);
            signal.put(Key.QUERY_LENGTH, queryLength);
            signal.put(Key.REACTION_TIME, timings.getReactionTime());
            signal.put(Key.URLBAR_TIME, timings.getUrlBarTime());
            signal.put(Key.POSITION_TYPE, positionType);
            signal.put(Key.INNER_LINK, innerLink);
            signal.put(Key.VERSION, BuildConfig.VERSION_NAME);
            if(isAutocompleted) {
                signal.put(Key.AUTOCOMPLETED, "url");
                signal.put(Key.AUTOCOMPLETED_LENGTH, autoCompleteLength);
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
            signal.put(Key.TYPE, Key.SHARE);
            signal.put(Key.ACTION, Action.CLICK);
            signal.put(Key.TARGET_TYPE, Key.MAIN);
            signal.put(Key.CONTEXT, context);
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
            signal.put(Key.TYPE, Key.NEWS_NOTIFICATION);
            signal.put(Key.ACTION, action);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        saveSignal(signal, false);
    }

    /**
     * Send signal whenever a new tab is opened
     * @param count Number of open tabs
     * @param isIncognito True if the new tab is incognito
     */
    public void sendNewTabSignal(int count, boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(Key.TYPE, Key.TABS);
            signal.put(Key.ACTION, Action.NEW_TAB);
            signal.put(Key.MODE, isIncognito ? Key.PRIVATE : Key.NORMAL);
            signal.put(Key.TAB_COUNT, count);
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
            signal.put(Key.TYPE, Key.TABS);
            signal.put(Key.ACTION, Action.OPEN_MENU);
            signal.put(Key.TAB_COUNT, count);
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
            signal.put(Key.TYPE, Key.TABS);
            signal.put(Key.ACTION, Action.OPEN_TAB);
            signal.put(Key.MODE, isIncognito ? Key.PRIVATE : Key.NORMAL);
            signal.put(Key.TAB_INDEX, position);
            signal.put(Key.TAB_COUNT, count);
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
    public void sendTabCloseSignal(int count, boolean isIncognito) {
        JSONObject signal = new JSONObject();
        try {
            signal.put(Key.TYPE, Key.TABS);
            signal.put(Key.ACTION, Action.CLOSE_TAB);
            signal.put(Key.MODE, isIncognito ? Key.PRIVATE : Key.NORMAL);
            signal.put(Key.TAB_COUNT, count);

        } catch (JSONException e) {
            e.printStackTrace();
        }
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

    /*
    protected synchronized void saveSignal(JSONObject signal) {
        addIdentifiers(signal);
        try {
            if(file.exists()) {
                FileInputStream fileInputStream = new FileInputStream(file);
                ObjectInputStream objectInputStream = new ObjectInputStream(fileInputStream);
                ArrayList< JSONObject > signalList =
                        (ArrayList<JSONObject>) objectInputStream.readObject();
                objectInputStream.close();
                fileInputStream.close();
                signalList.add(signal);
                FileOutputStream fileOutputStream = new FileOutputStream(file);
                ObjectOutputStream objectOutputStream = new ObjectOutputStream(fileOutputStream);
                objectOutputStream.writeObject(signalList);
                objectOutputStream.close();
                fileOutputStream.close();
                if(signalList.size() > BATCH_SIZE && !getNetworkState().equals("Disconnected")) {
                    File newFile = new File(context.getFilesDir(),
                            Constants.TELEMETRY_LOG_PREFIX+Long.toString(getUnixTimeStamp())+".dat");
                    file.renameTo(newFile);
                    HttpHandler httpHandler = new HttpHandler(mPreferenceManager, context);
                    executorService.execute(httpHandler);
                }
            } else {
                file.createNewFile();
                ArrayList<JSONObject> signalList = new ArrayList<>();
                signalList.add(signal);
                FileOutputStream fileOutputStream = new FileOutputStream(file);
                ObjectOutputStream objectOutputStream = new ObjectOutputStream(fileOutputStream);
                objectOutputStream.writeObject(signalList);
                objectOutputStream.close();
                fileOutputStream.close();
            }
        } catch (IOException e) {
            e.printStackTrace();
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
    }
    */

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
            signal.put(Key.SESSION, mPreferenceManager.getSessionId());
            signal.put(Key.TIME_STAMP, getUnixTimeStamp());
            signal.put(Key.TELEMETRY_SEQUENCE, telemetrySequence);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        mPreferenceManager.setTelemetrySequence(telemetrySequence);
    }

    /*
    //adds session id. timestamp, sequence number to the signals
    private void addIdentifiers(JSONObject signal) {
        int telemetrySequence = mPreferenceManager.getTelemetrySequence();
        signal.put(Key.SESSION, mPreferenceManager.getSessionId());
        signal.put(Key.TIME_STAMP, getUnixTimeStamp());
        signal.put(Key.TELEMETRY_SEQUENCE, telemetrySequence);
        mPreferenceManager.setTelemetrySequence(telemetrySequence);
    }
    */

    /**
     * Generates a SessionID as per the CLIQZ standard
     * @see <a href="https://github.com/cliqz/navigation-extension/wiki/Logging#session-id-format</a>
     * @return A newly generated SessionID
     */
    public String generateSessionID() {
        final String randomAlphaNumericString = generateRandomString(18, Key.ALPHA_NUMERIC_SPACE);
        final String randomNumericString = generateRandomString(6, Key.NUMERIC_SPACE);
        final String days = Long.toString(getUnixTimeStamp() / 86400000);
        final String channel = BuildConfig.DEBUG ? BuildConfig.TELEMETRY_DEBUG_CHANNEL : BuildConfig.TELEMETRY_CHANNEL;
        return randomAlphaNumericString + randomNumericString + "|" + days + "|" + channel;
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
            //check to make sure the app is in foreground
            if(timings.getAppUsageTime() < 0) {
                sendNetworkStatus();
            }
        }
    };

}
