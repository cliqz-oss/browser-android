package acr.browser.lightning.preference;

import android.content.Context;
import android.content.SharedPreferences;
import android.support.annotation.NonNull;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.Countries;
import com.cliqz.browser.main.CrashDetector;
import com.cliqz.browser.offrz.OffrzConfig;

import java.util.Locale;

import javax.inject.Singleton;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.constant.SearchEngines;
import acr.browser.lightning.download.DownloadHandler;

@SuppressWarnings({"unused", "SameParameterValue"})
@Singleton
public class PreferenceManager {

    private static final String FLAVOR_API_AMAZON = "amazon";
    private static final String FLAVOR_API_HUAWEI = "huawei";

    public enum ClearQueriesOptions {
        NO,
        CLEAR_HISTORY,
        CLEAR_FAVORITES,
        CLEAR_BOTH;

        public static ClearQueriesOptions safeValueOf(String name) {
            try {
                return ClearQueriesOptions.valueOf(name);
            } catch (IllegalArgumentException e) {
                return NO;
            }
        }
    }

    @SuppressWarnings("SpellCheckingInspection")
    private static class Name {
        static final String USER_SENTIMENT_SURVEY_201903 = "userSentimentSurvey201903Count";
        static final String ADOBE_FLASH_SUPPORT = "enableflash";
        static final String BLOCK_ADS = "AdBlock";
        static final String BLOCK_IMAGES = "blockimages";
        static final String NEWS_NOTIFICATION = "newsnotification";
        static final String CLEAR_CACHE_EXIT = "cache";
        static final String COOKIES = "cookies";
        static final String DOWNLOAD_DIRECTORY = "downloadLocation";
        static final String FULL_SCREEN = "fullscreen";
        static final String HIDE_STATUS_BAR = "hidestatus";
        static final String HOMEPAGE = "home";
        static final String INCOGNITO_COOKIES = "incognitocookies";
        static final String JAVASCRIPT = "java";
        static final String LOCATION = "location";
        static final String OVERVIEW_MODE = "overviewmode";
        static final String POPUPS = "newwindows";
        static final String RESTORE_LOST_TABS = "restoreclosed";
        static final String SAVE_PASSWORDS = "passwords";
        // The name was changed to support new String format (instead of int)
        static final String SEARCH = "searchCliqz";
        static final String SEARCH_URL = "searchurl";
        static final String TEXT_REFLOW = "textreflow";
        static final String TEXT_SIZE = "textsize";
        static final String URL_MEMORY = "memory";
        static final String USE_WIDE_VIEWPORT = "wideviewport";
        static final String USER_AGENT = "agentchoose";
        static final String USER_AGENT_STRING = "userAgentString";
        static final String GOOGLE_SEARCH_SUGGESTIONS = "GoogleSearchSuggestions";
        static final String CLEAR_HISTORY_EXIT = "clearHistoryExit";
        static final String CLEAR_COOKIES_EXIT = "clearCookiesExit";
        static final String SAVE_URL = "saveUrl";
        static final String RENDERING_MODE = "renderMode";
        static final String BLOCK_THIRD_PARTY = "thirdParty";
        static final String ENABLE_COLOR_MODE = "colorMode";
        static final String URL_BOX_CONTENTS = "urlContent";
        static final String INVERT_COLORS = "invertColors";
        static final String READING_TEXT_SIZE = "readingTextSize";
        static final String THEME = "Theme";
        static final String TEXT_ENCODING = "textEncoding";
        static final String CLEAR_WEBSTORAGE_EXIT = "clearWebStorageExit";
        static final String SHOW_TABS_IN_DRAWER = "showTabsInDrawer";
        static final String DO_NOT_TRACK = "doNotTrack";
        static final String IDENTIFYING_HEADERS = "removeIdentifyingHeaders";

        static final String USE_PROXY = "useProxy";
        static final String PROXY_CHOICE = "proxyChoice";
        static final String USE_PROXY_HOST = "useProxyHost";
        static final String USE_PROXY_PORT = "useProxyPort";
        static final String INITIAL_CHECK_FOR_TOR = "checkForTor";
        static final String INITIAL_CHECK_FOR_I2P = "checkForI2P";

        // CLIQZ
        static final String ONBOARDING_COMPLETE = "onboardingComplete";
        static final String SESSION_ID = "sessionId";
        static final String TELEMETRY_SEQUENCE = "telemetrySequence";
        static final String VERSION_CODE = "versionCode";
        static final String TIME_OF_LAST_ENVIRONMENT_SIGNAL = "lastEnvironmentSignal";
        static final String BLOCK_ADULT_CONTENT = "blockAdultContent";
        static final String HUMAN_WEB = "humanweb";
        static final String NEVER_ASK_GPS_PERMISSION = "gpsPermission";
        static final String CLEAR_QUERIES = "jsAPI.clearQueries";
        static final String GCM_TOKEN_SENT = "gcmTokenSent";
        static final String ARN_ENDPOINT = "aws_arn_endpoint";
        static final String ADVERT_ID = "advert_id";
        static final String OPTIMIZED_BLOCK_ADS = "optimized_block_ads";
        static final String REFERRER_URL = "referrer_url";
        static final String DISTRIBUTION = "distribution";
        static final String DISTRIBUTION_EXCEPTION = "distribution_exception";
        static final String COUNTRY = "country";
        static final String SHOULD_SHOW_ONBOARDING = "should_show_onboarding";
        static final String SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION = "should_show_anti_tracking_description";
        static final String SHOULD_SHOW_SEARCH_DESCRIPTION = "should_show_search_description";
        static final String ATTRACK_ENABLED = "attrack_enabled";
        static final String PAIRING_FIRST_DEVICE_DIALOG_SHOWN = "pairing_first_device_dialog_shown";
        // TODO: Temporary fix for faulty autocompletion
        static final String AUTO_COMPLETION_ENABLED = "auto_completion_enabled";
        static final String LAST_KNOWN_LOCATION = "last_known_location";
        static final String AB_TEST_LIST = "ab_test_list";
        static final String QUERY_SUGGESTIONS = "query_suggestion";
        static final String MAIN_ACTIVITY_LAST_STATE = "main_activity_last_state";
        static final String LATEST_APK_VERSION = "latest_installed_apk_version";
        static final String SHOULD_SHOW_YOUTUBE_DESCRIPTION = "should_show_youtube_description";
        static final String AUTO_FORGET_MODE = "auto_forget_mode";
        static final String CLOSE_TABS_ON_EXIT = "close_tabs_on_exit";
        static final String IS_FIRST_SUBSCRIPTION = "is_first_subscription";
        static final String SHOW_BACKGROUND_IMAGE = "show_background_image";
        static final String SHOW_TOP_SITES = "show_top_sites";
        static final String SHOW_NEWS = "show_news";
        static final String LIMIT_DATA_USAGE = "limit_data_usage";
        static final String IS_MYOFFRZ_ONBOARDING_ENABLED = "myoffrz_onboarding_enabled";
        static final String START_COUNT = "start_count";
        static final String MY_OFFRZ_ENABLED = "MY_OFFRZ_ENABLED";
        static final String SEND_USAGE_DATA = "SEND_USAGE_DATA";
    }

    private final SharedPreferences mPrefs;

    private static final String PREFERENCES = "settings";
    private static final int MAX_SURVEY_MESSAGE_SHOW_COUNT = 3;

    public PreferenceManager(final Context context) {
        mPrefs = context.getSharedPreferences(PREFERENCES, 0);
    }

    /**
     * Is adblocking enabled?
     * !!! As Richard asked on 2016/08/22 we should not enable adblocker by default !!!
     * Enabled for apk submitted to Amazon appstore
     *
     * @return true if adblocking is enabled, false otherwise
     */
    @SuppressWarnings("ConstantConditions")
    public boolean getAdBlockEnabled() {
        return mPrefs.getBoolean(Name.BLOCK_ADS,
                FLAVOR_API_AMAZON.equals(BuildConfig.FLAVOR_api) ||
                        FLAVOR_API_HUAWEI.equals(BuildConfig.FLAVOR_api));
    }

    public boolean getOptimizedAdBlockEnabled() {
        return mPrefs.getBoolean(Name.OPTIMIZED_BLOCK_ADS, true);
    }

    public boolean getBlockImagesEnabled() {
        return mPrefs.getBoolean(Name.BLOCK_IMAGES, false);
    }

    public boolean getBlockThirdPartyCookiesEnabled() {
        return mPrefs.getBoolean(Name.BLOCK_THIRD_PARTY, true);
    }

    public boolean getCheckedForTor() {
        return mPrefs.getBoolean(Name.INITIAL_CHECK_FOR_TOR, false);
    }

    public boolean getCheckedForI2P() {
        return mPrefs.getBoolean(Name.INITIAL_CHECK_FOR_I2P, false);
    }

    public boolean getClearCacheExit() {
        return mPrefs.getBoolean(Name.CLEAR_CACHE_EXIT, false);
    }

    public boolean getClearCookiesExitEnabled() {
        return mPrefs.getBoolean(Name.CLEAR_COOKIES_EXIT, false);
    }

    public boolean getClearWebStorageExitEnabled() {
        return mPrefs.getBoolean(Name.CLEAR_WEBSTORAGE_EXIT, false);
    }

    public boolean getClearHistoryExitEnabled() {
        return mPrefs.getBoolean(Name.CLEAR_HISTORY_EXIT, false);
    }

    public boolean getColorModeEnabled() {
        return mPrefs.getBoolean(Name.ENABLE_COLOR_MODE, false);
    }

    public boolean getCookiesEnabled() {
        return mPrefs.getBoolean(Name.COOKIES, true);
    }

    public String getDownloadDirectory() {
        return DownloadHandler.DEFAULT_DOWNLOAD_PATH;
    }

    public int getFlashSupport() {
        return mPrefs.getInt(Name.ADOBE_FLASH_SUPPORT, 0);
    }

    public boolean getFullScreenEnabled() {
        return mPrefs.getBoolean(Name.FULL_SCREEN, false);
    }

    public boolean getGoogleSearchSuggestionsEnabled() {
        return mPrefs.getBoolean(Name.GOOGLE_SEARCH_SUGGESTIONS, true);
    }

    public boolean getHideStatusBarEnabled() {
        return mPrefs.getBoolean(Name.HIDE_STATUS_BAR, false);
    }

    public String getHomepage() {
        return mPrefs.getString(Name.HOMEPAGE, Constants.HOMEPAGE);
    }

    public boolean getIncognitoCookiesEnabled() {
        return mPrefs.getBoolean(Name.INCOGNITO_COOKIES, false);
    }

    public boolean getInvertColors() {
        return mPrefs.getBoolean(Name.INVERT_COLORS, false);
    }

    public boolean getJavaScriptEnabled() {
        return mPrefs.getBoolean(Name.JAVASCRIPT, true);
    }

    public String getMemoryUrl() {
        return mPrefs.getString(Name.URL_MEMORY, "");
    }

    public boolean getOverviewModeEnabled() {
        return mPrefs.getBoolean(Name.OVERVIEW_MODE, true);
    }

    public boolean getPopupsEnabled() {
        return mPrefs.getBoolean(Name.POPUPS, true);
    }

    public String getProxyHost() {
        return mPrefs.getString(Name.USE_PROXY_HOST, "localhost");
    }

    public int getProxyPort() {
        return mPrefs.getInt(Name.USE_PROXY_PORT, 8118);
    }

    public int getReadingTextSize() {
        return mPrefs.getInt(Name.READING_TEXT_SIZE, 2);
    }

    public int getRenderingMode() {
        return mPrefs.getInt(Name.RENDERING_MODE, 0);
    }

    public boolean getRestoreLostTabsEnabled() {
        return mPrefs.getBoolean(Name.RESTORE_LOST_TABS, true);
    }

    public String getSavedUrl() {
        return mPrefs.getString(Name.SAVE_URL, null);
    }

    public boolean getSavePasswordsEnabled() {
        return mPrefs.getBoolean(Name.SAVE_PASSWORDS, true);
    }

    public SearchEngines getSearchChoice() {
        return SearchEngines.safeValueOf(mPrefs.getString(Name.SEARCH, ""));
    }

    public String getSearchUrl() {
        return mPrefs.getString(Name.SEARCH_URL, Constants.GOOGLE_SEARCH);
    }

    public boolean getTextReflowEnabled() {
        return mPrefs.getBoolean(Name.TEXT_REFLOW, false);
    }

    public int getTextSize() {
        return mPrefs.getInt(Name.TEXT_SIZE, 3);
    }

    public int getUrlBoxContentChoice() {
        return mPrefs.getInt(Name.URL_BOX_CONTENTS, 0);
    }

    public int getUseTheme() {
        return mPrefs.getInt(Name.THEME, 0);
    }

    public boolean getUseProxy() {
        return mPrefs.getBoolean(Name.USE_PROXY, false);
    }

    public int getProxyChoice() {
        return mPrefs.getInt(Name.PROXY_CHOICE, Constants.NO_PROXY);
    }

    public int getUserAgentChoice() {
        return mPrefs.getInt(Name.USER_AGENT, 1);
    }

    public String getUserAgentString(String def) {
        return mPrefs.getString(Name.USER_AGENT_STRING, def);
    }

    public boolean getUseWideViewportEnabled() {
        return mPrefs.getBoolean(Name.USE_WIDE_VIEWPORT, true);
    }

    public String getTextEncoding() {
        return mPrefs.getString(Name.TEXT_ENCODING, Constants.DEFAULT_ENCODING);
    }

    public boolean getShowTabsInDrawer(boolean defaultValue) {
        return mPrefs.getBoolean(Name.SHOW_TABS_IN_DRAWER, defaultValue);
    }

    public boolean getDoNotTrackEnabled() {
        return mPrefs.getBoolean(Name.DO_NOT_TRACK, false);
    }

    public boolean getRemoveIdentifyingHeadersEnabled() {
        return mPrefs.getBoolean(Name.IDENTIFYING_HEADERS, false);
    }

    public boolean getOnBoardingComplete() {
        return mPrefs.getBoolean(Name.ONBOARDING_COMPLETE, false);
    }

    public String getSessionId() {
        return mPrefs.getString(Name.SESSION_ID, null);
    }

    public int getTelemetrySequence() {
        return mPrefs.getInt(Name.TELEMETRY_SEQUENCE, 0);
    }

    public int getVersionCode() {
        return mPrefs.getInt(Name.VERSION_CODE, 0);
    }

    public long getTimeOfLastEnvSignal() {
        return mPrefs.getLong(Name.TIME_OF_LAST_ENVIRONMENT_SIGNAL, 0);
    }

    public boolean getBlockAdultContent() {
        return mPrefs.getBoolean(Name.BLOCK_ADULT_CONTENT, true);
    }

    public boolean getHumanWebEnabled() {
        return mPrefs.getBoolean(Name.HUMAN_WEB, true);
    }

    public boolean getNeverAskGPSPermission() {
        return mPrefs.getBoolean(Name.NEVER_ASK_GPS_PERMISSION, false);
    }

    public boolean getNewsNotificationEnabled() {
        return mPrefs.getBoolean(Name.NEWS_NOTIFICATION, true);
    }

    public String getDistribution() {
        return mPrefs.getString(Name.DISTRIBUTION, "");
    }

    public String getAdvertID() {
        return mPrefs.getString(Name.ADVERT_ID, "");
    }

    public boolean getDistributionException() {
        return mPrefs.getBoolean(Name.DISTRIBUTION_EXCEPTION, false);
    }

    @NonNull
    public String getReferrerUrl() {
        final String referrer = mPrefs.getString(Name.REFERRER_URL, "");
        return referrer != null ? referrer : "";
    }

    public boolean shouldShowTopSites() {
        return mPrefs.getBoolean(Name.SHOW_TOP_SITES, true);
    }

    public boolean shouldShowNews() {
        return mPrefs.getBoolean(Name.SHOW_NEWS, true);
    }

    public boolean shouldShowUserSentimentSurvey() {
        return (mPrefs.getInt(Name.USER_SENTIMENT_SURVEY_201903, 0) < MAX_SURVEY_MESSAGE_SHOW_COUNT);
    }

    public ClearQueriesOptions shouldClearQueries() {
        return ClearQueriesOptions.safeValueOf(mPrefs.getString(Name.CLEAR_QUERIES, "NO"));
    }

    public boolean isGCMTokenSent() {
        return mPrefs.getBoolean(Name.GCM_TOKEN_SENT, false);
    }

    /**
     * AWS ARN Enpoint for push notification
     *
     * @return The stored ARN endpoint or null if we don't have one
     */
    public String getARNEndpoint() {
        return mPrefs.getString(Name.ARN_ENDPOINT, null);
    }

    public boolean getAutocompletionEnabled() {
        return mPrefs.getBoolean(Name.AUTO_COMPLETION_ENABLED, false);
    }

    public boolean getShouldShowOnboarding() {
        return mPrefs.getBoolean(Name.SHOULD_SHOW_ONBOARDING, true);
    }

    public boolean getShouldShowAntiTrackingDescription() {
        return mPrefs.getBoolean(Name.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION, true);
    }

    public String getLastKnownLocation() {
        return mPrefs.getString(Name.LAST_KNOWN_LOCATION, "de");
    }

    public Countries getCountryChoice() {
        return Countries.safeValueOf(mPrefs.getString(Name.COUNTRY, getDefaultCountry()));
    }

    public boolean getShouldShowSearchDescription() {
        return mPrefs.getBoolean(Name.SHOULD_SHOW_SEARCH_DESCRIPTION, true);
    }

    public boolean getFirstDevicePaired() {
        return mPrefs.getBoolean(Name.PAIRING_FIRST_DEVICE_DIALOG_SHOWN, false);
    }

    public boolean isAttrackEnabled() {
        return mPrefs.getBoolean(Name.ATTRACK_ENABLED, true);
    }

    public int getMainActivityLastState() {
        return mPrefs.getInt(Name.MAIN_ACTIVITY_LAST_STATE, CrashDetector.State.UNKNOWN);
    }

    public int getLatestAppVersion() {
        return mPrefs.getInt(Name.LATEST_APK_VERSION, BuildConfig.VERSION_CODE - 1);
    }

    public boolean isAutoForgetEnabled() {
        return mPrefs.getBoolean(Name.AUTO_FORGET_MODE, true);
    }

    public boolean getCloseTabsExit() {
        return mPrefs.getBoolean(Name.CLOSE_TABS_ON_EXIT, false);
    }

    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
    public boolean isFirstSubscription() {
        return mPrefs.getBoolean(Name.IS_FIRST_SUBSCRIPTION, true);
    }

    public boolean isMyOffrzOnboardingEnabled() {
        return mPrefs.getBoolean(Name.IS_MYOFFRZ_ONBOARDING_ENABLED, true);
    }

    public boolean isBackgroundImageEnabled() {
        return mPrefs.getBoolean(Name.SHOW_BACKGROUND_IMAGE, true);
    }

    public boolean isSendUsageDataEnabled() {
        return mPrefs.getBoolean(Name.SEND_USAGE_DATA, true);
    }

    private void putBoolean(String name, boolean value) {
        mPrefs.edit().putBoolean(name, value).apply();
    }

    private void putInt(String name, int value) {
        mPrefs.edit().putInt(name, value).apply();
    }

    private void putString(String name, String value) {
        mPrefs.edit().putString(name, value).apply();
    }

    private void putLong(String name, long value) {
        mPrefs.edit().putLong(name, value).apply();
    }

    public void setSendUsageData(boolean value) {
        mPrefs.edit().putBoolean(Name.SEND_USAGE_DATA, value).apply();
    }

    public void setShouldShowBackgroundImage(boolean value) {
        putBoolean(Name.SHOW_BACKGROUND_IMAGE, value);
    }
    public void setMyOffrzOnboardingEnabled(boolean value) {
        putBoolean(Name.IS_MYOFFRZ_ONBOARDING_ENABLED, value);
    }

    public void setFirstSubscription(boolean value) {
        putBoolean(Name.IS_FIRST_SUBSCRIPTION, value);
    }
    public void setRemoveIdentifyingHeadersEnabled(boolean enabled) {
        putBoolean(Name.IDENTIFYING_HEADERS, enabled);
    }

    public void setDoNotTrackEnabled(boolean doNotTrack) {
        putBoolean(Name.DO_NOT_TRACK, doNotTrack);
    }

    public void setShowTabsInDrawer(boolean show) {
        putBoolean(Name.SHOW_TABS_IN_DRAWER, show);
    }

    public void setTextEncoding(String encoding) {
        putString(Name.TEXT_ENCODING, encoding);
    }

    public void setAdBlockEnabled(boolean enable) {
        putBoolean(Name.BLOCK_ADS, enable);
    }

    public void setOptimizedAdBlockEnabled(boolean enable) {
        putBoolean(Name.OPTIMIZED_BLOCK_ADS, enable);
    }

    public void setBlockImagesEnabled(boolean enable) {
        putBoolean(Name.BLOCK_IMAGES, enable);
    }

    public void setBlockThirdPartyCookiesEnabled(boolean enable) {
        putBoolean(Name.BLOCK_THIRD_PARTY, enable);
    }

    public void setCheckedForTor(boolean check) {
        putBoolean(Name.INITIAL_CHECK_FOR_TOR, check);
    }

    public void setCheckedForI2P(boolean check) {
        putBoolean(Name.INITIAL_CHECK_FOR_I2P, check);
    }

    public void setClearCacheExit(boolean enable) {
        putBoolean(Name.CLEAR_CACHE_EXIT, enable);
    }

    public void setClearCookiesExitEnabled(boolean enable) {
        putBoolean(Name.CLEAR_COOKIES_EXIT, enable);
    }

    public void setClearWebStorageExitEnabled(boolean enable) {
        putBoolean(Name.CLEAR_WEBSTORAGE_EXIT, enable);
    }

    public void setClearHistoryExitEnabled(boolean enable) {
        putBoolean(Name.CLEAR_HISTORY_EXIT, enable);
    }

    public void setColorModeEnabled(boolean enable) {
        putBoolean(Name.ENABLE_COLOR_MODE, enable);
    }

    public void setCookiesEnabled(boolean enable) {
        putBoolean(Name.COOKIES, enable);
    }

    public void setFlashSupport(int n) {
        putInt(Name.ADOBE_FLASH_SUPPORT, n);
    }

    public void setFullScreenEnabled(boolean enable) {
        putBoolean(Name.FULL_SCREEN, enable);
    }

    public void setGoogleSearchSuggestionsEnabled(boolean enabled) {
        putBoolean(Name.GOOGLE_SEARCH_SUGGESTIONS, enabled);
    }

    public void setHideStatusBarEnabled(boolean enable) {
        putBoolean(Name.HIDE_STATUS_BAR, enable);
    }

    public void setHomepage(String homepage) {
        putString(Name.HOMEPAGE, homepage);
    }

    public void setIncognitoCookiesEnabled(boolean enable) {
        putBoolean(Name.INCOGNITO_COOKIES, enable);
    }

    public void setInvertColors(boolean enable) {
        putBoolean(Name.INVERT_COLORS, enable);
    }

    public void setJavaScriptEnabled(boolean enable) {
        putBoolean(Name.JAVASCRIPT, enable);
    }

    public void setMemoryUrl(String url) {
        putString(Name.URL_MEMORY, url);
    }

    public void setOverviewModeEnabled(boolean enable) {
        putBoolean(Name.OVERVIEW_MODE, enable);
    }

    public void setPopupsEnabled(boolean enable) {
        putBoolean(Name.POPUPS, enable);
    }

    public void setReadingTextSize(int size) {
        putInt(Name.READING_TEXT_SIZE, size);
    }

    public void setRenderingMode(int mode) {
        putInt(Name.RENDERING_MODE, mode);
    }

    public void setRestoreLostTabsEnabled(boolean enable) {
        putBoolean(Name.RESTORE_LOST_TABS, enable);
    }

    public void setSavedUrl(String url) {
        putString(Name.SAVE_URL, url);
    }

    public void setSavePasswordsEnabled(boolean enable) {
        putBoolean(Name.SAVE_PASSWORDS, enable);
    }

    public void setSearchChoice(SearchEngines choice) {
        putString(Name.SEARCH, choice.name());
    }

    public void setSearchUrl(String url) {
        putString(Name.SEARCH_URL, url);
    }

    public void setTextReflowEnabled(boolean enable) {
        putBoolean(Name.TEXT_REFLOW, enable);
    }

    public void setTextSize(int size) {
        putInt(Name.TEXT_SIZE, size);
    }

    public void setUrlBoxContentChoice(int choice) {
        putInt(Name.URL_BOX_CONTENTS, choice);
    }

    public void setUseTheme(int theme) {
        putInt(Name.THEME, theme);
    }

    /**
     * Valid choices:
     * <ul>
     * <li>{@link Constants#NO_PROXY}</li>
     * <li>{@link Constants#PROXY_ORBOT}</li>
     * <li>{@link Constants#PROXY_I2P}</li>
     * </ul>
     *
     * @param choice the proxy to use.
     */
    public void setProxyChoice(int choice) {
        putBoolean(Name.USE_PROXY, choice != Constants.NO_PROXY);
        putInt(Name.PROXY_CHOICE, choice);
    }

    public void setProxyHost(String proxyHost) {
        putString(Name.USE_PROXY_HOST, proxyHost);
    }

    public void setProxyPort(int proxyPort) {
        putInt(Name.USE_PROXY_PORT, proxyPort);
    }

    public void setUserAgentChoice(int choice) {
        putInt(Name.USER_AGENT, choice);
    }

    public void setUserAgentString(String agent) {
        putString(Name.USER_AGENT_STRING, agent);
    }

    public void setUseWideViewportEnabled(boolean enable) {
        putBoolean(Name.USE_WIDE_VIEWPORT, enable);
    }

    public void setOnBoardingComplete(boolean done) {
        putBoolean(Name.ONBOARDING_COMPLETE, done);
    }

    public void setSessionId(String sessionId) {
        putString(Name.SESSION_ID, sessionId);
    }

    public void setTelemetrySequence(int telemetrySequence) {
        telemetrySequence = (telemetrySequence + 1) % 2147483647;
        putInt(Name.TELEMETRY_SEQUENCE, telemetrySequence);
    }

    public void setVersionCode(int versionCode) {
        putInt(Name.VERSION_CODE, versionCode);
    }

    public void setTimeOfLastEnvSignal(long time) {
        putLong(Name.TIME_OF_LAST_ENVIRONMENT_SIGNAL, time);
    }

    public void setBlockAdultContent(boolean enable) {
        putBoolean(Name.BLOCK_ADULT_CONTENT, enable);
    }

    public void setHumanWebEnabled(boolean enable) {
        putBoolean(Name.HUMAN_WEB, enable);
    }

    public void setNeverAskGPSPermission(boolean neverAskGPSPermission) {
        putBoolean(Name.NEVER_ASK_GPS_PERMISSION, neverAskGPSPermission);
    }

    public void setNewsNotificationEnabled(boolean enable) {
        putBoolean(Name.NEWS_NOTIFICATION, enable);
    }

    public void setShouldClearQueries(ClearQueriesOptions value) {
        if (value == ClearQueriesOptions.NO || shouldClearQueries() == ClearQueriesOptions.NO) {
            putString(Name.CLEAR_QUERIES, value.name());
        } else if (shouldClearQueries() != value) {
            putString(Name.CLEAR_QUERIES, ClearQueriesOptions.CLEAR_BOTH.name());
        } else {
            putString(Name.CLEAR_QUERIES, value.name());
        }
    }

    public void setGCMTokenSent(boolean value) {
        putBoolean(Name.GCM_TOKEN_SENT, value);
    }

    public void setARNEndpoint(String value) {
        putString(Name.ARN_ENDPOINT, value);
    }

    public void setDistribution(String distribution) {
        putString(Name.DISTRIBUTION, distribution);
    }

    public void setAdvertID(String advertID) {
        putString(Name.ADVERT_ID, advertID);
    }

    public void setDistributionException(boolean exception) {
        putBoolean(Name.DISTRIBUTION_EXCEPTION, exception);
    }

    public void setReferrerUrl(String referrerUrl) {
        putString(Name.REFERRER_URL, referrerUrl);
    }

    public void setAutocompletionEnabled(boolean value) {
        putBoolean(Name.AUTO_COMPLETION_ENABLED, value);
    }

    public void setAttrackEnabled(boolean value) {
        putBoolean(Name.ATTRACK_ENABLED, value);
    }

    public void setShouldShowOnboarding(boolean value) {
        putBoolean(Name.SHOULD_SHOW_ONBOARDING, value);
    }

    public void setShouldShowAntiTrackingDescription(boolean value) {
        putBoolean(Name.SHOULD_SHOW_ANTI_TRACKING_DESCRIPTION, value);
    }

    public void setShouldShowSearchDescription(boolean value) {
        putBoolean(Name.SHOULD_SHOW_SEARCH_DESCRIPTION, value);
    }

    public void setLastKnownLocation(String location) {
        putString(Name.LAST_KNOWN_LOCATION, location);
    }

    public void setCountryChoice(Countries choice) {
        putString(Name.COUNTRY, choice.name());
    }

    private String getDefaultCountry() {
        final String deviceCountry = Locale.getDefault().getCountry().toLowerCase();
        for (Countries country : Countries.values()) {
            if (country.countryCode.equals(deviceCountry)) {
                return country.name();
            }
        }
        return Countries.usa.name();
    }

    public void setAllOnBoardingPreferences(boolean value) {
        setShouldShowOnboarding(value);
        setShouldShowAntiTrackingDescription(value);
        setShouldShowSearchDescription(value);
    }

    public void setFirstDevicePaired(boolean value) {
        putBoolean(Name.PAIRING_FIRST_DEVICE_DIALOG_SHOWN, value);
    }

    public void setABTestPreference(String preferenceName, boolean value) {
        putBoolean(preferenceName, value);
    }

    public boolean getABTestPreference(String preferenceName) {
        return mPrefs.getBoolean(preferenceName, false);
    }

    public void setABTestList(String list) {
        putString(Name.AB_TEST_LIST, list);
    }

    public String getABTestList() {
        return mPrefs.getString(Name.AB_TEST_LIST, "");
    }

    public boolean getQuerySuggestionEnabled() {
        return mPrefs.getBoolean(Name.QUERY_SUGGESTIONS, true);
    }

    public void setQuerySuggestionEnabled(Boolean newValue) {
        putBoolean(Name.QUERY_SUGGESTIONS, newValue);
    }

    public void setMainActivityLastState(int lastState) {
        putInt(Name.MAIN_ACTIVITY_LAST_STATE, lastState);
    }

    public void setLastAppVersion(int version) {
        putInt(Name.LATEST_APK_VERSION, version);
    }

    public void setAutoForgetModeEnabled(boolean newValue) {
        putBoolean(Name.AUTO_FORGET_MODE, newValue);
    }

    public boolean getShouldShowYouTubeDescription() {
        return mPrefs.getBoolean(Name.SHOULD_SHOW_YOUTUBE_DESCRIPTION, true);
    }

    public void setShouldShowYouTubeDescription(boolean value) {
        putBoolean(Name.SHOULD_SHOW_YOUTUBE_DESCRIPTION, value);
    }

    public void setCloseTabsExit(boolean value) {
        putBoolean(Name.CLOSE_TABS_ON_EXIT, value);
    }

    public void setShouldShowTopSites(boolean value) {
        putBoolean(Name.SHOW_TOP_SITES, value);
    }

    public void setShouldShowNews(boolean value) {
        putBoolean(Name.SHOW_NEWS, value);
    }

    public boolean shouldLimitDataUsage() {
        return mPrefs.getBoolean(Name.LIMIT_DATA_USAGE, true);
    }

    public void setLimitDataUsage(boolean value) {
        putBoolean(Name.LIMIT_DATA_USAGE, value);
    }

    public int getStartsCount() {
        final int startsCount = mPrefs.getInt(Name.START_COUNT, 1);
        putInt(Name.START_COUNT, startsCount+1);
        return startsCount;
    }

    public boolean isMyOffrzEnable(){
        boolean defaultValue = OffrzConfig.isOffrzSupportedForLang();
        return mPrefs.getBoolean(Name.MY_OFFRZ_ENABLED,defaultValue);
    }

    public void setMyOffrzEnable(boolean value){
        putBoolean(Name.MY_OFFRZ_ENABLED,value);
    }

    public void updateUserSurvey201903Count() {
        final int value = mPrefs.getInt(Name.USER_SENTIMENT_SURVEY_201903, 0);
        putInt(Name.USER_SENTIMENT_SURVEY_201903, value + 1);
    }
}
