package com.cliqz.browser.utils;

import android.content.res.Resources;
import android.net.Uri;
import android.os.Build;
import android.webkit.WebView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

import javax.inject.Inject;

import acr.browser.lightning.database.LoginDetailItem;
import acr.browser.lightning.database.PasswordDatabase;

/**
 * Created by Ravjit on 24/02/16.
 */
public class PasswordManager {

    @Inject
    PasswordDatabase passwordDatabase;

    public PasswordManager() {
        BrowserApp.getAppComponent().inject(this);
    }

    private static final class QueryParameters  {
        private QueryParameters() {}

        private static final String DOMAIN = "domain";
        private static final String USERNAME = "username";
        private static final String PASSWORD = "password";
    }

    public void injectJavascript(WebView webView) {
        final Resources resources = webView.getResources();
        final InputStream inputStream = resources.openRawResource(R.raw.password_manager_script);
        try {
            final String passwordManagerScript = String.format(convertStreamToString(inputStream),webView.hashCode());
            executeJS(passwordManagerScript, webView);
            inputStream.close();

        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    /**
     * This method handles the dummy GET requests sent by the javascript for password management.
     * This method is called only if the webpage has id and password input fields.
     * The uri always have a DOMAIN parameter, and optionally USERNAME and PASSWORD parameters.
     * If the USERNAME and PASSWORD parameters don't exist in the request, then it checks for existence
     * of previously saved username and password in the database, and inserts it in the webpage.
     * If the uri has USERNAME and PASSWORD parameters, then it saves it to the database.
     * @param uri URI of the dummy GET request sent by JavaScript
     * @param view The webview in which the page is loaded
     */
    public void provideOrSavePassword(Uri uri, WebView view) {
        final String domain = uri.getQueryParameter(QueryParameters.DOMAIN);
        final String username = uri.getQueryParameter(QueryParameters.USERNAME);
        final String password = uri.getQueryParameter(QueryParameters.PASSWORD);
        if (domain == null) {
            return;
        }
        if (username == null && password == null) {
            final LoginDetailItem loginDetailItem = passwordDatabase.getLoginDetails(domain);
            if (loginDetailItem != null) {
                String loginId = loginDetailItem.getLoginId();
                String loginPassword = loginDetailItem.getPassword();
                executeJS("fillLoginDetails('" + loginId + "','" + loginPassword + "')", view);
            }
        } else if (username != null && password != null) {
            LoginDetailItem loginDetailItem = new LoginDetailItem(domain, username, password);
            passwordDatabase.saveLoginDetails(loginDetailItem);
        }
    }

    private String convertStreamToString(InputStream inputStream) throws IOException {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        int i = inputStream.read();
        while (i != -1) {
            byteArrayOutputStream.write(i);
            i = inputStream.read();
        }
        return byteArrayOutputStream.toString();
    }

    private final void executeJS(final String js, final WebView webView) {
        if (js != null && !js.isEmpty()) {
            webView.post(new Runnable() {
                @Override
                public void run() {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                        webView.evaluateJavascript(js, null);
                    } else {
                        webView.loadUrl("javascript:" + js);
                    }
                }
            });
        }
    }

}
