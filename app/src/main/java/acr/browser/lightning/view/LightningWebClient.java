package acr.browser.lightning.view;

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
import android.support.annotation.DrawableRes;
import android.support.annotation.NonNull;
import android.support.v7.app.AlertDialog;
import android.text.InputType;
import android.text.method.PasswordTransformationMethod;
import android.util.Log;
import android.webkit.HttpAuthHandler;
import android.webkit.SslErrorHandler;
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

import java.io.ByteArrayInputStream;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.UrlUtils;

/**
 * @author Stefano Pacifici based on Anthony C. Restaino's code
 * @date 2015/09/22
 */
class LightningWebClient extends WebViewClient implements AntiPhishing.AntiPhishingCallback {

    private static final String CLIQZ_PATH = "/CLIQZ";

    private final Context context;
    private final LightningView lightningView;
    private String mLastUrl = "";
    private final AntiPhishingDialog antiPhishingDialog;
    LightningWebClient(Context context, LightningView lightningView) {
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
        response = lightningView.jsengine.webRequest.shouldInterceptRequest(view, request);
        if (response == null) {
            return null;
        }

        final String reason = response.getReasonPhrase();

        if (reason != null) {
            if (reason.contains("ATTRACK")) {
                view.post(new Runnable() {
                    @Override
                    public void run() {
                        lightningView.eventBus.post(new Messages.UpdateTrackerCount());
                    }
                });
            }
            return response;
        }
        return null;
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
        final Uri uri = Uri.parse(url);
        WebResourceResponse response = handleUrl(view, uri);
        return response;
    }

    private WebResourceResponse handleUrl(final WebView view, Uri uri) {
        final String cliqzPath = String.format("%s%d", CLIQZ_PATH, view.hashCode());
        final String path = uri.getPath();

        if (TrampolineConstants.CLIQZ_SCHEME.equals(uri.getScheme())) {
            // Urls with the cliqz scheme
            if (TrampolineConstants.CLIQZ_TRAMPOLINE_AUTHORITY.equals(uri.getAuthority())) {
                if (TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO_PATH.equals(path)) {
                    final Resources resources = view.getResources();
                    final WebResourceResponse response =
                            new WebResourceResponse("text/html", "UTF-8",
                                    resources.openRawResource(R.raw.trampoline_forward));
                    return response;
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
            lightningView.passwordManager.provideOrSavePassword(uri, view);
            return createOKResponse();
        }
        return null;
    }

    private WebResourceResponse createOKResponse() {
        final WebResourceResponse response =
                new WebResourceResponse("test/plain", "UTF-8",
                        new ByteArrayInputStream("OK".getBytes()));
        return response;
    }

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
        lightningView.eventBus.post(new BrowserEvents.TabsChanged());
    }

    @Override
    public void onPageStarted(WebView view, String url, Bitmap favicon) {
        @DrawableRes final int controlCenterIcon = lightningView.attrack.isWhitelisted(Uri.parse(url).getHost())
                ? R.drawable.ic_cc_orange : R.drawable.ic_cc_green;
        lightningView.eventBus.post(new Messages.UpdateControlCenterIcon(controlCenterIcon));
        try {
            final String regex = "^((w|m)[a-zA-Z0-9-]{0,}\\.)";
            final String domain = new URL(url).getHost().replaceFirst(regex,"");
            if (!lightningView.isIncognitoTab() && lightningView.bloomFilterUtils.contains(domain)) {
                lightningView.eventBus.post(new Messages.SwitchToForget());
            } else if (lightningView.isAutoForgetTab() && !lightningView.bloomFilterUtils.contains(domain)) {
                lightningView.eventBus.post(new Messages.SwitchToNormalTab());
            }
        } catch (MalformedURLException e) {
            e.printStackTrace();
        }
        if (!mLastUrl.equals(url)) {
            lightningView.historyId = -1;
            mLastUrl = url;
            if (url != null && !url.isEmpty() && !url.startsWith("cliqz://")) {
                lightningView.antiPhishing.processUrl(url, this);
            }
        }
        if(lightningView.telemetry.backPressed) {
            if(!url.contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
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
        lightningView.eventBus.post(new BrowserEvents.TabsChanged());
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

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, String url) {
        final Uri uri = Uri.parse(url);
        final String scheme = uri.getScheme();
        // Removed as version 1.0.2r2
        // Check if configured proxy is available
        // if (!lightningView.isProxyReady()) {
        //     // User has been notified
        //     return true;
        // }

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
                intent.addCategory(Intent.CATEGORY_BROWSABLE);
                intent.setComponent(null);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.ICE_CREAM_SANDWICH_MR1) {
                    intent.setSelector(null);
                }
                try {
                    context.startActivity(intent);
                } catch (ActivityNotFoundException e) {
                    Log.e(Constants.TAG, "ActivityNotFoundException");
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
        // CLIQZ! We do not want to open external app from our browser, so we return false here
        // boolean startActivityForUrl = mIntentUtils.startActivityForUrl(view, url);
        if(!url.contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
            lightningView.telemetry.sendNavigationSignal(url.length());
        }
        // return startActivityForUrl;
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

}
