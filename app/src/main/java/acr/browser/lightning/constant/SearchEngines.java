package acr.browser.lightning.constant;

import androidx.annotation.StringRes;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
public enum SearchEngines {
    cliqz("Cliqz", R.string.cliqz_url, "unused"),
    google("Google", R.string.google_url, "file:///android_asset/google.png"),
    // ask("Ask", Constants.ASK_SEARCH, "file:///android_asset/ask.png"),
    bing("Bing", R.string.bing_url, "file:///android_asset/bing.png"),
    yahoo("Yahoo", R.string.yahoo_url, "file:///android_asset/yahoo.png"),
    // startpage("Startpage", Constants.STARTPAGE_SEARCH, "file:///android_asset/startpage.png"),
    // startpageMobile("Startpage Mobile", Constants.STARTPAGE_MOBILE_SEARCH, "file:///android_asset/startpage.png"),
    duckDuckGo("DuckDuckGo", R.string.duck_url, "file:///android_asset/duckduckgo.png"),
    // duckDuckGoLite("DuckDuckGoLite", Constants.DUCK_LITE_SEARCH, "file:///android_asset/duckduckgo.png"),
    // baidu("Baidu", Constants.BAIDU_SEARCH, "file:///android_asset/baidu.png"),
    // yandex("Yandex", Constants.YANDEX_SEARCH, "file:///android_asset/yandex.png");
    ecosia("Ecosia", R.string.ecosia_url, "file:///android_asset/ecosia.png"),
    startpage("StartPage", R.string.startpage_url, "file:///android_asset/startpage.png"),
    qwant("Qwant", R.string.qwant_url, "unused");

    public static SearchEngines safeValueOf(String value) {
        try {
            return SearchEngines.valueOf(value);
        } catch (IllegalArgumentException e) {
            return cliqz;
        }
    }
    public final String engineName;
    public final @StringRes int engineUrl;
    public final String engineIconPath;

    SearchEngines(String name, @StringRes int url, String path) {
        engineName = name;
        engineUrl = url;
        engineIconPath = path;
    }

}
