/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.constant;


public final class Constants {

    private Constants() {
    }

    public static final String DESKTOP_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987 Safari/603.1.30";
    public static final String GOOGLE_SEARCH = "https://www.google.com/search?client=com.cliqz.browser&ie=UTF-8&oe=UTF-8&q=";
    public static final String HOMEPAGE = "file:///android_asset/homepage/index.html";
    public static final String JAVASCRIPT_INVERT_PAGE = "javascript:(function(){var e='img {-webkit-filter: invert(100%);'+'-moz-filter: invert(100%);'+'-o-filter: invert(100%);'+'-ms-filter: invert(100%); }',t=document.getElementsByTagName('head')[0],n=document.createElement('style');if(!window.counter){window.counter=1}else{window.counter++;if(window.counter%2==0){var e='html {-webkit-filter: invert(0%); -moz-filter: invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }'}}n.type='text/css';if(n.styleSheet){n.styleSheet.cssText=e}else{n.appendChild(document.createTextNode(e))}t.appendChild(n)})();";
    public static final String JAVASCRIPT_TEXT_REFLOW = "javascript:document.getElementsByTagName('body')[0].style.width=window.innerWidth+'px';";
    public static final String JAVASCRIPT_COLLAPSE_SECTIONS = "localStorage.removeItem('expandedSections')";
    public static final String GCM_REGISTRATION_COMPLETE = "gcm_registration_completed";

    //Keys for arguments in intents/bundles
    public static final String KEY_IS_INCOGNITO = "incognito";

    public static final String SEPARATOR = "\\|\\$\\|SEPARATOR\\|\\$\\|";
    public static final String HTTPS = "https://";
    public static final String FILE = "file://";
    public static final String TAG = "Lightning";

    // These should match the order of @array/proxy_choices_array
    public static final int NO_PROXY = 0;
    public static final int PROXY_ORBOT = 1;
    public static final int PROXY_I2P = 2;

    public static final String DEFAULT_ENCODING = "UTF-8";

    public static final String TELEMETRY_LOG_PREFIX = "telemetry_";

    public static final String NOTIFICATION_CLICKED = "notification_clicked";
    public static final String NOTIFICATION_TYPE = "notification_from";

    public static final String CONTROL_CENTER = "control_center";

    //Permission Codes
    public static final int LOCATION_PERMISSION = 1;
}
