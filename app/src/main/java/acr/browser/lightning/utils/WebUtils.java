package acr.browser.lightning.utils;

import android.content.Context;
import android.os.Build;
import androidx.annotation.NonNull;
import android.webkit.CookieManager;
import android.webkit.CookieSyncManager;
import android.webkit.WebStorage;
import android.webkit.WebView;

import java.io.File;

/**
 * Copyright 8/4/2015 Anthony Restaino
 */
public class WebUtils {

    public static void clearCookies(@NonNull Context context) {
        CookieManager c = CookieManager.getInstance();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            c.removeAllCookies(null);
        } else {
            //noinspection deprecation
            CookieSyncManager.createInstance(context);
            //noinspection deprecation
            c.removeAllCookie();
        }
    }

    public static void clearWebStorage(Context context) {
        WebStorage.getInstance().deleteAllData();
        //The following files and dirs never get deleted by any of the webview apis. Gotta delete them manually
        final String dataDirPath = context.getApplicationInfo().dataDir;
        final File serviceWorkerDir = new File(dataDirPath + "/app_webview/Service Worker/");
        final File quotaManager = new File(dataDirPath + "/app_webview/QuotaManager");
        final File quotaManagerJournal = new File(dataDirPath + "/app_webview/QuotaManager-journal");
        Utils.deleteDir(serviceWorkerDir);
        Utils.deleteDir(quotaManager);
        Utils.deleteDir(quotaManagerJournal);
    }

    public static void clearCache(Context context) {
        final WebView webView = new WebView(context);
        webView.clearCache(true);
    }

}
