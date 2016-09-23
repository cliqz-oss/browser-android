package com.cliqz.browser.webview;

/**
 * @author Stefano Pacifici
 * @date 2016/09/06
 */
public final class ExtensionEvents {

    private ExtensionEvents() {} // No instances

    public static final String CLIQZ_EVENT_SHOW = "mobile-browser:show";
    public static final String CLIQZ_EVENT_SEARCH = "mobile-browser:search";
    public static final String CLIQZ_EVENT_NOTIFY_PREFERENCES = "mobile-browser:notify-preferences";
    public static final String CLIQZ_EVENT_RESTORE_BLOCKED_TOPSITES = "mobile-browser:restore-blocked-topsites";
    public static final String CLIQZ_EVENT_RESET_STATE = "mobile-browser:reset-state";
    public static final String CLIQZ_EVENT_SET_SEARCH_ENGINE = "mobile-browser:set-search-engine";
    public static final String CLIQZ_EVENT_PUBLISH_CARD_URL = "mobile-browser:publish-card-url";
    public static final String CLIQZ_EVENT_CLEAR_FAVORITES = "mobile-browser:clear-favorites";
    public static final String CLIQZ_EVENT_CLEAR_HISTORY = "mobile-browser:clear-history";
    public static final String CLIQZ_EVENT_PERFORM_SHOWCASE_CARD_SWIPE = "mobile-browser:showcase-swipe-card";
}
