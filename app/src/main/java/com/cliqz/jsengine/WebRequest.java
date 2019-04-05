package com.cliqz.jsengine;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import android.util.Pair;
import android.util.SparseBooleanArray;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.NoSuchKeyException;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.lang.ref.WeakReference;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;

/**
 * @author Sam Macbeth
 */
public class WebRequest extends ReactContextBaseJavaModule {

    private final static String TAG = WebRequest.class.getSimpleName();

    private static final Pattern RE_JS = Pattern.compile("\\.js($|\\|?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RE_CSS = Pattern.compile("\\.css($|\\|?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RE_IMAGE = Pattern.compile("\\.(?:gif|png|jpe?g|bmp|ico)($|\\|?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RE_FONT = Pattern.compile("\\.(?:ttf|woff)($|\\|?)", Pattern.CASE_INSENSITIVE);
    private static final Pattern RE_HTML = Pattern.compile("\\.html?", Pattern.CASE_INSENSITIVE);
    private static final Pattern RE_JSON = Pattern.compile("\\.json($|\\|?)", Pattern.CASE_INSENSITIVE);

    private static final Set<String> SUPPORTED_SCHEMES = new HashSet<>(Arrays.asList("http", "https"));

    private static final int NUM_OTHER = 1;
    private static final int NUM_SCRIPT = 2;
    private static final int NUM_IMAGE = 3;
    private static final int NUM_STYLESHEET = 4;
    private static final int NUM_DOCUMENT = 6;
    private static final int NUM_SUBDOCUMENT = 7;
    private static final int NUM_XMLHTTPREQUEST = 11;
    private static final int NUM_FONT = 14;

    @SuppressLint("UseSparseArrays")
    private final Map<Integer, Pair<Uri, WeakReference<WebView>>> tabs = new HashMap<>();
    private final SparseBooleanArray tabHasChanged = new SparseBooleanArray();

    private final Engine engine;

    private AtomicInteger requestId = new AtomicInteger(1);

    WebRequest(ReactApplicationContext reactContext, final Engine engine) {
        super(reactContext);
        this.engine = engine;
    }

    @Override
    public String getName() {
        return "WebRequest";
    }


    @ReactMethod
    public void isWindowActive(int tabId, Promise promise) {
        promise.resolve(isTabActive(tabId));
    }

    private boolean isTabActive(final int tabId) {
        Pair<Uri, WeakReference<WebView>> tuple = tabs.get(tabId);
        return tuple != null && tuple.second.get() != null;
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    public WebResourceResponse shouldInterceptRequest(final WebView view, final WebResourceRequest request,
                                                      boolean isPrivateTab) {
        final boolean isMainDocument = request.isForMainFrame();
        final Uri requestUrl = request.getUrl();
        final int tabId = view.hashCode();

        // save urls for tab - no action for main document requests
        if (isMainDocument) {
            tabs.put(tabId, Pair.create(requestUrl, new WeakReference<>(view)));
            tabHasChanged.put(tabId, false);

            // clean up dead tabs
            for (Iterator<Map.Entry<Integer, Pair<Uri, WeakReference<WebView>>>> it = tabs.entrySet().iterator(); it.hasNext(); ) {
                Map.Entry<Integer, Pair<Uri, WeakReference<WebView>>> e = it.next();
                if (e.getValue().second.get() == null) {
                    it.remove();
                    tabHasChanged.delete(e.getKey());
                }
            }
        }

        // check for supported schemes
        if (!SUPPORTED_SCHEMES.contains(requestUrl.getScheme())) {
            Log.d(TAG, "Skipped unrecognised url scheme: " + requestUrl.getScheme());
            return null;
        }

        final String headersAccept = request.getRequestHeaders().get("Accept");
        final int contentPolicyType;
        if (isMainDocument) {
            contentPolicyType = NUM_DOCUMENT;
        } else if (headersAccept != null) {
            if (headersAccept.contains("text/css")) {
                contentPolicyType = NUM_STYLESHEET;
            } else if (headersAccept.contains("image/*") || headersAccept.contains("image/webp")) {
                contentPolicyType = NUM_IMAGE;
            } else if (headersAccept.contains("text/html")) {
                contentPolicyType = NUM_SUBDOCUMENT;
            } else {
                contentPolicyType = guessContentPolicyTypeFromUrl(requestUrl.toString());
            }
        } else {
            contentPolicyType = guessContentPolicyTypeFromUrl(requestUrl.toString());
        }

        final String originUrl;
        if (isMainDocument) {
            originUrl = requestUrl.toString();
        } else {
            final Pair<Uri, WeakReference<WebView>> origin = tabs.get(tabId);
            originUrl = origin != null ? origin.first.toString() : null;
        }
        if (originUrl == null) {
            return null;
        }
        final WritableMap requestInfo = Arguments.createMap();
        requestInfo.putInt("requestId", requestId.getAndIncrement());
        requestInfo.putString("url", requestUrl.toString());
        requestInfo.putString("method", request.getMethod());
        requestInfo.putInt("tabId", view.hashCode());
        requestInfo.putInt("parentFrameId", -1);
        requestInfo.putInt("frameId", tabId);
        requestInfo.putBoolean("isPrivate", isPrivateTab);
        requestInfo.putString("originUrl", originUrl);
        requestInfo.putString("sourceUrl", originUrl);
        requestInfo.putString("frameUrl", originUrl);
        requestInfo.putInt("type", contentPolicyType);

        final WritableMap requestHeaders = Arguments.createMap();
        for (Map.Entry<String, String> e : request.getRequestHeaders().entrySet()) {
            requestHeaders.putString(e.getKey(), e.getValue());
        }
        requestInfo.putMap("requestHeaders", requestHeaders);

        try {
            final ReadableMap response = engine.getBridge().callAction("webRequest", requestInfo);
            final ReadableMap blockResponse = response.getMap("result");
            final String source = blockResponse.hasKey("source") ? blockResponse.getString("source") : "";
            // counter for tab
            if (blockResponse.hasKey("shouldIncrementCounter") && blockResponse.getBoolean("shouldIncrementCounter")) {
                tabHasChanged.put(tabId, true);
            }
            if (blockResponse.hasKey("cancel") && blockResponse.getBoolean("cancel")) {
                Log.d(TAG, "Block request: " + requestUrl.toString());
                return blockRequest(source);
            } else if (blockResponse.hasKey("redirectUrl") || blockResponse.hasKey("requestHeaders")) {
                String newUrl;
                if (blockResponse.hasKey("redirectUrl")) {
                    newUrl = blockResponse.getString("redirectUrl");
                } else {
                    newUrl = requestUrl.toString();
                }
                Map<String, String> modifiedHeaders = new HashMap<>();
                if (blockResponse.hasKey("requestHeaders")) {
                    ReadableArray headers = blockResponse.getArray("requestHeaders");
                    for (int i = 0; i < headers.size(); i++) {
                        ReadableMap header = headers.getMap(i);
                        modifiedHeaders.put(header.getString("name"), header.getString("value"));
                    }
                }
                Log.d(TAG, "Modify request from: " + requestUrl.toString());
                return modifyRequest(source, request, newUrl, modifiedHeaders);
            }
        } catch (ActionNotAvailable e) {
            Log.w("webrequest", "jsengine not ready yet", e);
        } catch (EmptyResponseException e) {
            Log.w("webrequest", "jsengine timed out", e);
        } catch (EngineNotYetAvailable e) {
            Log.w("webrequest", "jsengine not yet loaded", e);
        } catch (NoSuchKeyException e) {
            Log.e("webrequest", "error in jsengine response", e);
        }

        return null;
    }

    public boolean getTabHasChanged(final WebView view) {
        return tabHasChanged.get(view.hashCode(), false);
    }

    public void resetTabHasChanged(final WebView view) {
        tabHasChanged.put(view.hashCode(), false);
    }

    private static int guessContentPolicyTypeFromUrl(final String url) {
        if (RE_JSON.matcher(url).find()) {
            return NUM_OTHER;
        } else if (RE_JS.matcher(url).find()) {
            return NUM_SCRIPT;
        } else if (RE_CSS.matcher(url).find()) {
            return NUM_STYLESHEET;
        } else if (RE_IMAGE.matcher(url).find()) {
            return NUM_IMAGE;
        } else if (RE_FONT.matcher(url).find()) {
            return NUM_FONT;
        } else if (RE_HTML.matcher(url).find()) {
            return NUM_SUBDOCUMENT;
        } else {
            return NUM_XMLHTTPREQUEST;
        }
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    private WebResourceResponse modifyRequest(final String decisionSource, WebResourceRequest request, String newUrlString, Map<String, String> modifyHeaders) {
        HttpURLConnection connection;
        try {
            URL newUrl = new URL(newUrlString);
            connection = (HttpURLConnection) newUrl.openConnection();
            // set up attributes request to match original
            for (Map.Entry<String, String> e : request.getRequestHeaders().entrySet()) {
                connection.setRequestProperty(e.getKey(), e.getValue());
            }
            // headers from args
            for (Map.Entry<String, String> e : modifyHeaders.entrySet()) {
                connection.setRequestProperty(e.getKey(), e.getValue());
            }
            connection.setRequestMethod(request.getMethod());


            Log.d(TAG, "Redirect to: " + newUrlString);
            connection.connect();
            final WebResourceResponse response = new WebResourceResponse(connection.getContentType(), connection.getContentEncoding(), connection.getInputStream());
            final String reasonPhrase = decisionSource.length() > 0 ? decisionSource : connection.getResponseMessage();
            response.setStatusCodeAndReasonPhrase(connection.getResponseCode(), reasonPhrase);
            // parse response headers
            final Map<String, String> responseHeaders = new HashMap<>();
            for (Map.Entry<String, List<String>> e : connection.getHeaderFields().entrySet()) {
                for (String value : e.getValue()) {
                    responseHeaders.put(e.getKey(), value);
                }
            }
            response.setResponseHeaders(responseHeaders);
            return response;
        } catch (MalformedURLException e) {
            Log.e(TAG, "Bad redirect url: " + e.getMessage());
            return blockRequest(decisionSource);
        } catch (IllegalArgumentException | IOException e) {
            Log.e(TAG, "Could not redirect: " + e.getMessage());
            return blockRequest(decisionSource);
        }
    }

    @TargetApi(Build.VERSION_CODES.LOLLIPOP)
    private WebResourceResponse blockRequest(String decisionSource) {
        final WebResourceResponse response = new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream("".getBytes()));
        if (decisionSource.length() == 0) {
            decisionSource = "Blocked";
        }
        response.setStatusCodeAndReasonPhrase(204, decisionSource);
        return response;
    }

}
