package acr.browser.lightning.constant;

/**
 * @author Stefano Pacifici
 * @date 2016/01/11
 */
public enum SearchEngines {
    google("Google", Constants.GOOGLE_SEARCH, "file:///android_asset/google.png"),
    // ask("Ask", Constants.ASK_SEARCH, "file:///android_asset/ask.png"),
    bing("Bing", Constants.BING_SEARCH, "file:///android_asset/bing.png"),
    yahoo("Yahoo", Constants.YAHOO_SEARCH, "file:///android_asset/yahoo.png"),
    // startpage("Startpage", Constants.STARTPAGE_SEARCH, "file:///android_asset/startpage.png"),
    // startpageMobile("Startpage Mobile", Constants.STARTPAGE_MOBILE_SEARCH, "file:///android_asset/startpage.png"),
    duckDuckGo("DuckDuckGo", Constants.DUCK_SEARCH, "file:///android_asset/duckduckgo.png"),
    // duckDuckGoLite("DuckDuckGoLite", Constants.DUCK_LITE_SEARCH, "file:///android_asset/duckduckgo.png"),
    // baidu("Baidu", Constants.BAIDU_SEARCH, "file:///android_asset/baidu.png"),
    // yandex("Yandex", Constants.YANDEX_SEARCH, "file:///android_asset/yandex.png");
    ecosia("Ecosia", Constants.ECOSIA_SEARCH, "file:///android_asset/ecosia.png"),
    startpage("StartPage", Constants.STARTPAGE_SEARCH, "file:///android_asset/startpage.png");

    public static SearchEngines safeValueOf(String value) {
        try {
            return SearchEngines.valueOf(value);
        } catch (IllegalArgumentException e) {
            return google;
        }
    }
    public final String engineName;
    public final String engineUrl;
    public final String engineIconPath;

    SearchEngines(String name, String url, String path) {
        engineName = name;
        engineUrl = url;
        engineIconPath = path;
    }

}
