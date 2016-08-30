/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.constant;


import android.annotation.SuppressLint;
import android.os.Environment;

import com.cliqz.browser.BuildConfig;

public final class Constants {

    public static final long HOME_RESET_DELAY = 1800000; // milliseconds, 30 minutes
    @SuppressLint("SdCardPath")
    public static final String ONBOARDING_OVERRIDE_FILE = "/sdcard/com.cliqz.browser.no_onboarding";

    private Constants() {
    }

    public static final boolean FULL_VERSION = BuildConfig.FULL_VERSION;

    public static final String DESKTOP_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2049.0 Safari/537.36";
    public static final String MOBILE_USER_AGENT = "Mozilla/5.0 (Linux; U; Android 4.4; en-us; Nexus 4 Build/JOP24G) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30";
    public static final String YAHOO_SEARCH = "https://search.yahoo.com/search?p=";
    public static final String GOOGLE_SEARCH = "https://www.google.com/search?client=com.cliqz.browser&ie=UTF-8&oe=UTF-8&q=";
    public static final String BING_SEARCH = "https://www.bing.com/search?q=";
    public static final String DUCK_SEARCH = "https://duckduckgo.com/?t=com.cliqz.browser&q=";
    public static final String ECOSIA_SEARCH = "https://www.ecosia.org/search?q=";
    public static final String DUCK_LITE_SEARCH = "https://duckduckgo.com/lite/?t=com.cliqz.browser&q=";
    public static final String STARTPAGE_MOBILE_SEARCH = "https://startpage.com/do/m/mobilesearch?language=english&query=";
    public static final String STARTPAGE_SEARCH = "https://startpage.com/do/search?language=english&query=";
    public static final String ASK_SEARCH = "http://www.ask.com/web?qsrc=0&o=0&l=dir&qo=lightningBrowser&q=";
    public static final String HOMEPAGE = "file:///android_asset/homepage/index.html";
    public static final String INCOGNITO_HOMEPAGE = "file:///android_asset/incognito/index.html";
    public static final String OPEN_TABS = "file:///android_asset/tab-mngt/tabs.html";
    public static final String BAIDU_SEARCH = "https://www.baidu.com/s?wd=";
    public static final String YANDEX_SEARCH = "https://yandex.ru/yandsearch?lr=21411&text=";
    public static final String JAVASCRIPT_INVERT_PAGE = "javascript:(function(){var e='img {-webkit-filter: invert(100%);'+'-moz-filter: invert(100%);'+'-o-filter: invert(100%);'+'-ms-filter: invert(100%); }',t=document.getElementsByTagName('head')[0],n=document.createElement('style');if(!window.counter){window.counter=1}else{window.counter++;if(window.counter%2==0){var e='html {-webkit-filter: invert(0%); -moz-filter: invert(0%); -o-filter: invert(0%); -ms-filter: invert(0%); }'}}n.type='text/css';if(n.styleSheet){n.styleSheet.cssText=e}else{n.appendChild(document.createTextNode(e))}t.appendChild(n)})();";
    public static final String JAVASCRIPT_LOAD_ANTIPHISHING = "javascript:(function(d){script = d.createElement('script'); script.type = 'text/javascript'; script.async = true; script.onload = function() { window.setTimeout(function() { CliqzAntiPhishing.auxOnPageLoad(document.location.href); }, 10) }; script.src = 'cliqz://js/CliqzAntiPhishing.js'; d.getElementsByTagName('head')[0].appendChild(script)})(document);";
    public static final String JAVASCRIPT_TEXT_REFLOW = "javascript:document.getElementsByTagName('body')[0].style.width=window.innerWidth+'px';";
    public static final String JAVASCRIPT_COLLAPSE_SECTIONS = "localStorage.removeItem('expandedSections')";
    public static final String GCM_REGISTRATION_COMPLETE = "gcm_registration_completed";

    //Keys for arguments in intents/bundles
    public static final String KEY_DO_NOT_SHOW_ONBOARDING = "do_not_show_onboarding";
    public static final String KEY_IS_INCOGNITO = "incognito";
    public static final String KEY_URL = "url";
    public static final String KEY_NEW_TAB_MESSAGE = "new_tab_message";
    public static final String KEY_QUERY = "query";


    public static final String LOAD_READING_URL = "ReadingUrl";

    public static final String SEPARATOR = "\\|\\$\\|SEPARATOR\\|\\$\\|";
    public static final String HTTP = "http://";
    public static final String HTTPS = "https://";
    public static final String FILE = "file://";
    public static final String FOLDER = "folder://";
    public static final String TAG = "Lightning";

    // These should match the order of @array/proxy_choices_array
    public static final int NO_PROXY = 0;
    public static final int PROXY_ORBOT = 1;
    public static final int PROXY_I2P = 2;
    public static final int PROXY_MANUAL = 3;

    /**
     * The bookmark page standard suffix
     */
    public static final String BOOKMARKS_FILENAME = "bookmarks.html";

    public static final String DEFAULT_ENCODING = "UTF-8";

    public static final String[] TEXT_ENCODINGS = {"ISO-8859-1", "UTF-8", "GBK", "Big5", "ISO-2022-JP", "SHIFT_JS", "EUC-JP", "EUC-KR"};

    public static final String EXTERNAL_STORAGE = Environment.getExternalStorageDirectory().toString();

    public static final String TABS_SCREENSHOT_FOLDER_NAME = "tabs";

    public static final String TELEMETRY_FILE_NAME = "telemetry.dat";

    public static final String TELEMETRY_LOG_PREFIX = "telemetry_";

    public static final String NOTIFICATION_CLICKED = "notification_clicked";

}
