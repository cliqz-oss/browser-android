package acr.browser.lightning.view;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Message;
import android.support.annotation.NonNull;
import android.support.v7.app.AlertDialog;
import android.text.InputType;
import android.text.method.PasswordTransformationMethod;
import android.util.Log;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.cliqz.browser.R;
import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.Messages.ControlCenterStatus;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.cliqz.jsengine.WebRequest;

import java.io.ByteArrayInputStream;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.UrlUtils;

/**
 * @author Anthony C. Restaino
 * @author Stefano Pacifici
 */
class LightningWebClient extends WebViewClient implements AntiPhishing.AntiPhishingCallback {

    @SuppressWarnings("unused")
    private static final String TAG = LightningWebClient.class.getSimpleName();
    private static final String CLIQZ_PATH = "/CLIQZ";
    private static Pattern SPIEGEL_REGEX = Pattern.compile(".*\\.spiegel\\.de/?.*");
    private static Set<String> SPIEGEL_FILTER = new HashSet<>(Arrays.asList(
            "http://ssl.p.jwpcdn.com/player/v/7.8.1/gapro.js",
            "http://ssl.p.jwpcdn.com/player/v/7.8.1/jwpsrv.js",
            "http://ssl.p.jwpcdn.com/player/v/7.8.1/provider.html5.js",
            "http://ssl.p.jwpcdn.com/player/v/7.8.1/related.js",
            "http://ssl.p.jwpcdn.com/player/v/7.8.1/vast.js"
    ));

    private final Context context;
    private final LightningView lightningView;
    private String mLastUrl = "";
    private final AntiPhishingDialog antiPhishingDialog;
    private String mCurrentHost = "";

    LightningWebClient(@NonNull Context context, @NonNull LightningView lightningView) {
        this.context = context;
        this.lightningView = lightningView;
        this.antiPhishingDialog = new AntiPhishingDialog(context, lightningView.eventBus, lightningView.telemetry);
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        WebResourceResponse response = handleUrl(view, request.getUrl());
        if (response != null) {
            return response;
        }
        try {
            final WebRequest webRequest = lightningView.jsengine.getWebRequest();
            response = webRequest.shouldInterceptRequest(view, request, lightningView.isIncognitoTab());
            if (response == null) {
                // Handle spigel video bug here
                final String requestUrl = request.getUrl().toString();
                if (SPIEGEL_REGEX.matcher(mLastUrl).matches() && SPIEGEL_FILTER.contains(requestUrl)) {
                    return createOKResponse();
                }
                return null;
            }
            if (webRequest.getTabHasChanged(view)) {
                view.post(new Runnable() {
                    @Override
                    public void run() {
                        lightningView.lightingViewListenerListener.increaseAntiTrackingCounter();
                    }
                });
                webRequest.resetTabHasChanged(view);
            }
            return response;
        } catch (EngineNotYetAvailable e) {
            return null;
        }
    }

    @SuppressWarnings("deprecation")
    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        final Uri uri = Uri.parse(url);
        return handleUrl(view, uri);
    }

    private WebResourceResponse handleUrl(final WebView view, Uri uri) {
        final String cliqzPath = String.format(Locale.US, "%s%d", CLIQZ_PATH, view.hashCode());
        final String path = uri.getPath();

        if (TrampolineConstants.CLIQZ_SCHEME.equals(uri.getScheme())) {
            // Urls with the cliqz scheme
            if (TrampolineConstants.CLIQZ_TRAMPOLINE_AUTHORITY.equals(uri.getAuthority())) {
                if (TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO_PATH.equals(path)) {
                    final Resources resources = view.getResources();
                    return new WebResourceResponse("text/html", "UTF-8",
                                    resources.openRawResource(R.raw.trampoline_forward));
                }
                if (TrampolineConstants.CLIQZ_TRAMPOLINE_SEARCH_PATH.equals(path)) {
                    final String query = uri.getQueryParameter("q");
                    lightningView.telemetry.sendBackPressedSignal("web", "cards", query.length());
                    view.post(new Runnable() {
                        @Override
                        public void run() {
                            lightningView.eventBus.post(new Messages.ShowSearch(query));
                        }
                    });
                    return createOKResponse();
                }
                if (TrampolineConstants.CLIQZ_TRAMPOLINE_CLOSE_PATH.equals(path)) {
                    view.post(new Runnable() {
                        @Override
                        public void run() {
                            lightningView.eventBus.post(new BrowserEvents.CloseTab());
                        }
                    });
                }
                if (TrampolineConstants.CLIQZ_TRAMPOLINE_HISTORY_PATH.equals(path)) {
                    lightningView.telemetry.sendBackPressedSignal("web", "history", 0);
                    view.post(new Runnable() {
                        @Override
                        public void run() {
                            lightningView.eventBus.post(new Messages.GoToOverview());
                            if (lightningView.canGoBack()) {
                                lightningView.goBack();
                            } else {
                                lightningView.eventBus.post(new Messages.ShowSearch(""));
                            }
                        }
                    });
                    return createOKResponse();
                }
            }
        } else if (cliqzPath.equals(path)) {
            // Urls with the special CLIQZ Path
            if (uri.getHost().equals(mCurrentHost)) {
                // make sure that script is asking for password from same domain
                lightningView.passwordManager.provideOrSavePassword(uri, view);
            }
            return createOKResponse();
        }
        return null;
    }

    private WebResourceResponse createOKResponse() {
        return new WebResourceResponse("test/plain", "UTF-8",
                        new ByteArrayInputStream("OK".getBytes()));
    }

    @SuppressLint("ObsoleteSdkInt")
    @TargetApi(Build.VERSION_CODES.KITKAT)
    @Override
    public void onPageFinished(WebView view, String url) {
        if (view.isShown()) {
            lightningView.eventBus.post(new BrowserEvents.UpdateUrl(url,true));
            view.postInvalidate();
        }
        final String title = view.getTitle();
        if (title != null &&
                !title.isEmpty() &&
                !title.startsWith(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO) &&
                !TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO.equals(url)) {
            lightningView.mTitle.setTitle(view.getTitle());
            lightningView.eventBus.post(new Messages.UpdateTitle());
            if (!lightningView.isIncognitoTab()) {
                lightningView.persister.persist(lightningView.getId(), title, url, view);
            }
        }
        if (Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT &&
                lightningView.getInvertePage()) {
            view.evaluateJavascript(Constants.JAVASCRIPT_INVERT_PAGE, null);
        }

        if (!lightningView.isIncognitoTab() && lightningView.preferences.getSavePasswordsEnabled()) {
            //Inject javascript to check for id and pass fields in the page
            lightningView.passwordManager.injectJavascript(view);
        }
        ((CliqzWebView)view).executeJS(Constants.JAVASCRIPT_COLLAPSE_SECTIONS);
        lightningView.eventBus.post(new CliqzMessages.OnPageFinished());
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        final Uri uri = Uri.parse(url);
        final String host = uri.getHost();
        if (lightningView.lightingViewListenerListener != null) {
            lightningView.lightingViewListenerListener.onFavIconLoaded(favicon);
        }
        mCurrentHost = host;
        final ControlCenterStatus status;
        if (host != null && lightningView.attrack.isWhitelisted(host)) {
            status = ControlCenterStatus.DISABLED; //hack change whitelisted icon instead
        } else {
            status = ControlCenterStatus.ENABLED;
        }
        lightningView.eventBus.post(new Messages.UpdateControlCenterIcon(status));
        try {
            final String regex = "^(([wm])[a-zA-Z0-9-]*\\.)";
            final String domain = new URL(url).getHost().replaceFirst(regex,"");
            if (lightningView.preferences.isAutoForgetEnabled()
                    && !lightningView.isIncognitoTab()
                    && lightningView.bloomFilterUtils.contains(domain)) {
                lightningView.eventBus.post(new Messages.SwitchToForget());
            } else if (lightningView.isAutoForgetTab() && !lightningView.bloomFilterUtils.contains(domain)) {
                lightningView.eventBus.post(new Messages.SwitchToNormalTab());
            }
        } catch (MalformedURLException e) {
            // NOP
        }
        if (!mLastUrl.equals(url)) {
            lightningView.historyId = -1;
            mLastUrl = url;
            if (url != null && !url.isEmpty() && !url.startsWith("cliqz://")) {
                lightningView.antiPhishing.processUrl(url, this);
            }
        }
        if(lightningView.telemetry.backPressed) {
            if(url != null && !url.contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
                if(lightningView.telemetry.showingCards) {
                    lightningView.telemetry.sendBackPressedSignal("cards", "web", url.length());
                    lightningView.telemetry.showingCards = false;
                } else {
                    lightningView.telemetry.sendBackPressedSignal("web", "web", url.length());
                }
            }
            lightningView.telemetry.backPressed = false;
        }
        lightningView.mTitle.setFavicon(null);
        if (lightningView.isShown()) {
            lightningView.eventBus.post(new BrowserEvents.UpdateUrl(url, false));
            lightningView.eventBus.post(new BrowserEvents.ShowToolBar());
        }
        lightningView.eventBus.post(new Messages.ResetTrackerCount());
    }

    @Override
    public void onReceivedHttpAuthRequest(final WebView view, @NonNull final HttpAuthHandler handler,
                                          final String host, final String realm) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        final EditText name = new EditText(context);
        final EditText password = new EditText(context);
        LinearLayout passLayout = new LinearLayout(context);
        passLayout.setOrientation(LinearLayout.VERTICAL);

        passLayout.addView(name);
        passLayout.addView(password);

        name.setHint(context.getString(R.string.hint_username));
        name.setSingleLine();
        password.setInputType(InputType.TYPE_TEXT_VARIATION_PASSWORD);
        password.setSingleLine();
        password.setTransformationMethod(new PasswordTransformationMethod());
        password.setHint(context.getString(R.string.hint_password));
        builder.setTitle(context.getString(R.string.title_sign_in));
        builder.setView(passLayout);
        builder.setCancelable(true)
                .setPositiveButton(context.getString(R.string.title_sign_in),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                String user = name.getText().toString();
                                String pass = password.getText().toString();
                                handler.proceed(user.trim(), pass.trim());
                                Log.d(Constants.TAG, "Request Login");
                            }
                        })
                .setNegativeButton(context.getString(R.string.action_cancel),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                handler.cancel();

                            }
                        });
        AlertDialog alert = builder.create();
        alert.show();

    }

    private boolean mIsRunning = false;
    private float mZoomScale = 0.0f;

    @SuppressLint("ObsoleteSdkInt")
    @TargetApi(Build.VERSION_CODES.KITKAT)
    @Override
    public void onScaleChanged(final WebView view, final float oldScale, final float newScale) {
        if (view.isShown() && lightningView.preferences.getTextReflowEnabled() &&
                Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.KITKAT) {
            if (mIsRunning)
                return;
            if (Math.abs(mZoomScale - newScale) > 0.01f) {
                mIsRunning = view.postDelayed(new Runnable() {

                    @Override
                    public void run() {
                        mZoomScale = newScale;
                        view.evaluateJavascript(Constants.JAVASCRIPT_TEXT_REFLOW, null);
                        mIsRunning = false;
                    }

                }, 100);
            }

        }
    }

    private static List<Integer> getAllSslErrorMessageCodes(SslError error) {
        List<Integer> errorCodeMessageCodes = new ArrayList<>();

        if (error.hasError(SslError.SSL_DATE_INVALID)) {
            errorCodeMessageCodes.add(R.string.message_certificate_date_invalid);
        }
        if (error.hasError(SslError.SSL_EXPIRED)) {
            errorCodeMessageCodes.add(R.string.message_certificate_expired);
        }
        if (error.hasError(SslError.SSL_IDMISMATCH)) {
            errorCodeMessageCodes.add(R.string.message_certificate_domain_mismatch);
        }
        if (error.hasError(SslError.SSL_NOTYETVALID)) {
            errorCodeMessageCodes.add(R.string.message_certificate_not_yet_valid);
        }
        if (error.hasError(SslError.SSL_UNTRUSTED)) {
            errorCodeMessageCodes.add(R.string.message_certificate_untrusted);
        }
        if (error.hasError(SslError.SSL_INVALID)) {
            errorCodeMessageCodes.add(R.string.message_certificate_invalid);
        }

        return errorCodeMessageCodes;
    }

    @Override
    public void onReceivedSslError(WebView view, @NonNull final SslErrorHandler handler, SslError error) {
        List<Integer> errorCodeMessageCodes = getAllSslErrorMessageCodes(error);

        final String webViewUrl = view.getUrl();
        final String errorUrl = error.getUrl();

        if (webViewUrl != null && !webViewUrl.equals(errorUrl)) {
            // Alwasy cancel requests to third party with invalid certificates
            handler.cancel();
            return;
        }

        StringBuilder stringBuilder = new StringBuilder();
        for (Integer messageCode : errorCodeMessageCodes) {
            stringBuilder.append(" - ").append(context.getString(messageCode)).append('\n');
        }
        String alertMessage =
                context.getString(R.string.message_insecure_connection, stringBuilder.toString());

        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(context.getString(R.string.title_warning));
        builder.setMessage(alertMessage)
                .setCancelable(true)
                .setPositiveButton(context.getString(R.string.action_yes),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                handler.proceed();
                            }
                        })
                .setNegativeButton(context.getString(R.string.action_no),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                handler.cancel();
                            }
                        });
        builder.create().show();
    }

    @Override
    public void onFormResubmission(WebView view, @NonNull final Message dontResend, final Message resend) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(context.getString(R.string.title_form_resubmission));
        builder.setMessage(context.getString(R.string.message_form_resubmission))
                .setCancelable(true)
                .setPositiveButton(context.getString(R.string.action_yes),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                resend.sendToTarget();
                            }
                        })
                .setNegativeButton(context.getString(R.string.action_no),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                                dontResend.sendToTarget();
                            }
                        });
        AlertDialog alert = builder.create();
        alert.show();
    }

    @SuppressWarnings("deprecation")
    @SuppressLint("ObsoleteSdkInt")
    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        final Uri uri = Uri.parse(url);
        final String scheme = uri.getScheme();

        if (lightningView.isIncognitoTab()) {
            return super.shouldOverrideUrlLoading(view, url);
        }

        if (scheme.equals("about")) {
            return super.shouldOverrideUrlLoading(view, url);
        }

        if (scheme.equals("intent")) {
            Intent intent;
            try {
                intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            } catch (URISyntaxException ex) {
                return false;
            }
            if (intent != null) {
                try {
                    final URL realUrl = new URL(intent.getDataString());
                    view.loadUrl(realUrl.toString());
                } catch (MalformedURLException e) {
                    // Silently ignore this
                }
                return true;
            }
        }

        if (!scheme.equals("http") && !scheme.equals("https")) {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            PackageManager packageManager = context.getPackageManager();
            List<ResolveInfo> activites = packageManager.queryIntentActivities(intent, 0);
            if (activites.size() > 0) {
                context.startActivity(intent);
            } else {
                Toast.makeText(context, context.getString(R.string.app_not_found), Toast.LENGTH_SHORT).show();
            }
            return true;
        }
        if(!url.contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
            lightningView.telemetry.sendNavigationSignal(url.length());
        }
        return false;
    }

    @Override
    public void onUrlProcessed(final String url, boolean isPhishing) {
        if (!isPhishing) { return; }
        lightningView.activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (!url.equals(mLastUrl)|| antiPhishingDialog.isShowing()) { return; }
                antiPhishingDialog.setUrl(UrlUtils.getDomain(url));
                antiPhishingDialog.show();
            }
        });
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
        if (errorCode == ERROR_FAILED_SSL_HANDSHAKE && Build.VERSION.SDK_INT <
                Build.VERSION_CODES.KITKAT) {
            final Uri uri = Uri.parse(failingUrl);
            if (uri.isHierarchical() && uri.getHost().startsWith("amp.")) {
                final String newUrl = failingUrl.replace("amp", "www");
                lightningView.setUrlSSLError(true);
                view.loadData("", "", null);
                view.loadUrl(newUrl, null);
                return;
            }
        }
        super.onReceivedError(view, errorCode, description, failingUrl);
        handleErrors(view, Uri.parse(failingUrl));
    }

    @TargetApi(23)
    @Override
    public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
        super.onReceivedError(view, request, error);
        handleErrors(view, request.getUrl());
    }

    private void handleErrors(WebView view, Uri failingUrl) {
        final String schema = failingUrl != null ? failingUrl.getScheme() : null;
        if (schema == null) {
            return;
        }

        // Try to handle market:// links (i.e. Facebook's install messanger)
        if ("market".equals(schema)) {
            final Intent intent = new Intent(Intent.ACTION_VIEW, failingUrl);
            try {
                lightningView.activity.startActivity(intent);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    view.evaluateJavascript("document.documentElement.innerHTML=\"\"", null);
                }else{
                    view.loadUrl("document.documentElement.innerHTML=\"\"", null);
                }
            } catch (ActivityNotFoundException e) {
                // Nothing to do here
            }
        }
    }
}
