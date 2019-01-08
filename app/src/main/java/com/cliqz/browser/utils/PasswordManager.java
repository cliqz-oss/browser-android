package com.cliqz.browser.utils;

import android.app.Activity;
import android.content.res.Resources;
import android.net.Uri;
import android.os.Build;
import android.support.annotation.NonNull;
import android.util.Log;
import android.webkit.WebView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.SavePasswordDialog;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.utils.StreamUtils;

import java.io.IOException;
import java.io.InputStream;

import javax.inject.Inject;

import acr.browser.lightning.database.LoginDetailItem;
import acr.browser.lightning.database.PasswordDatabase;

/**
 * @author Ravjit Uppal
 */
public class PasswordManager implements SavePasswordDialog.PasswordDialogListener {

    private static final String TAG = PasswordManager.class.getSimpleName();

    @Inject
    PasswordDatabase passwordDatabase;

    @Inject
    Telemetry telemetry;

    private Activity mActivity;

    public PasswordManager(Activity activity) {
        mActivity = activity;
        final MainActivityComponent component = BrowserApp.getActivityComponent(mActivity);
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public void save(LoginDetailItem loginDetailItem) {
        passwordDatabase.saveLoginDetails(loginDetailItem);

    }

    @Override
    public void neverSave(LoginDetailItem loginDetailItem) {
        passwordDatabase.addDomainToBlackList(loginDetailItem.domain);
    }

    private static final class QueryParameters  {
        private QueryParameters() {}

        private static final String USERNAME = "username";
        private static final String PASSWORD = "password";
    }

    public void injectJavascript(@NonNull WebView webView) {
        try {
            final String url = webView.getUrl();
            if (url == null || url.isEmpty()) {
                return;
            }
            final Uri uri = Uri.parse(url);
            if (passwordDatabase.isDomainBlackListed(uri.getHost())) {
                return;
            }
            final Resources resources = webView.getResources();
            final InputStream inputStream = resources.openRawResource(R.raw.password_manager_script);
            final String passwordManagerScript =
                    String.format(StreamUtils.readTextStream(inputStream), webView.hashCode());
            executeJS(passwordManagerScript, webView);
            inputStream.close();

        } catch (IOException e) {
            Log.e(TAG, "error reading the js code", e);
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
        final String domain = uri.getHost();
        final String username = uri.getQueryParameter(QueryParameters.USERNAME);
        final String password = uri.getQueryParameter(QueryParameters.PASSWORD);
        if (domain == null) {
            return;
        }
        if (username == null && password == null) {
            final LoginDetailItem loginDetailItem = passwordDatabase.getLoginDetails(domain);
            if (loginDetailItem != null) {
                String loginId = loginDetailItem.loginId;
                String loginPassword = loginDetailItem.password;
                executeJS("fillLoginDetails('" + loginId + "','" + loginPassword + "')", view);
            }
        } else if (username != null && password != null) {
            LoginDetailItem loginDetailItem = new LoginDetailItem(domain, username, password);
            SavePasswordDialog.show(mActivity, this, loginDetailItem, telemetry);
        }
    }

    private void executeJS(final String js, final WebView webView) {
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
