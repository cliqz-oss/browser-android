package com.cliqz.antitracking;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import android.util.Pair;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import com.cliqz.utils.StreamUtils;
import com.eclipsesource.v8.JavaCallback;
import com.eclipsesource.v8.JavaVoidCallback;
import com.eclipsesource.v8.V8;
import com.eclipsesource.v8.V8Array;
import com.eclipsesource.v8.V8Object;
import com.eclipsesource.v8.V8ResultUndefined;
import com.eclipsesource.v8.V8ScriptExecutionException;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;

/**
 * Created by sammacbeth on 18/05/16.
 */
public class AntiTracking {

    private final static String TAG = AntiTracking.class.getSimpleName();

    private final static String ADBLOCK_ABTEST_PREF_NAME = "cliqz-adb-abtest";
    private final static String ADBLOCK_PREF_NAME = "cliqz-adb";
    private final static boolean ADBLOCK_ABTEST_DEFAULT = true;
    private final static int ADBLOCK_PREF_DEFAULT = 1;
    
    private boolean mEnabled;
    private boolean mAdblockEnabled = true;

    private final Map<Integer, Pair<Uri, WeakReference<WebView>>> tabs = new HashMap<>();

    private final V8Engine v8;

    private V8Object mWebRequest = null;

    final private Set<String> TELEMETRY_WHITELIST = new HashSet<>(Arrays.asList("attrack.FP", "attrack.tp_events"));

    public AntiTracking(final Context context, final AntiTrackingSupport support) {
        mEnabled = support.isAntiTrackTestEnabled();
        mAdblockEnabled = false;
        // Create a v8 javascript, then load native bindings and polyfill, and the antitracking module
        v8 = new V8Engine(context);
        try {
            v8.asyncQuery(new V8Engine.Query<Object>() {

                public Object query(V8 runtime) {
                    // set up System global for module import
                    runtime.executeVoidScript("var exports = {}");
                    v8.loadJavascriptSource("v8/system-polyfill.js");
                    runtime.executeVoidScript("var System = exports.System;");
                    v8.loadJavascriptSource("v8/fs-polyfill.js");

                    // Register a method for telemetry, which will send some anti-tracking telemetry
                    // to the mobile telemetry endpoint.
                    runtime.registerJavaMethod(new JavaVoidCallback() {
                        @Override
                        public void invoke(V8Object v8Object, V8Array v8Array) {
                            String msg = v8Array.get(0).toString();
                            try {
                                JSONObject obj = new JSONObject(msg);
                                if (TELEMETRY_WHITELIST.contains(obj.getString("action"))) {
                                    Log.d(TAG, "Save message with action "+ obj.getString("action"));
                                    support.sendSignal(obj);
                                } else {
                                    Log.d(TAG, "Drop message with action "+ obj.getString("action"));
                                }
                            } catch (JSONException e) {
                                Log.e(TAG, "sendTelemetry: bad JSON string");
                            }
                        }
                    }, "sendTelemetry");
                    // register a method to check if a tab is still open
                    runtime.registerJavaMethod(new JavaCallback() {
                        @Override
                        public Object invoke(V8Object v8Object, V8Array v8Array) {
                            int windowId = Integer.parseInt(v8Array.get(0).toString());
                            Pair<Uri, WeakReference<WebView>> tuple = tabs.get(windowId);
                            // if the webview has been garbage collected, the WeakReference.get method
                            // will return null
                            if (tuple != null && tuple.second.get() != null) {
                                return true;
                            }
                            return false;
                        }
                    }, "_nativeIsWindowActive");

                    // load config file
                    InputStream stream = null;
                    try {
                        stream = context.getAssets().open("v8/config/cliqz.json");
                        BufferedReader srcReader = new BufferedReader(new InputStreamReader(stream));
                        String script = "";
                        String line;
                        while ((line = srcReader.readLine()) != null) {
                            script += line + "\n";
                        }
                        script = "var __CONFIG__ = JSON.parse(\"" + script.replace("\"", "\\\"").replace("\n", "") + "\");";
                        runtime.executeVoidScript(script);
                    } catch (IOException e) {
                        Log.e(TAG, "Error loading config file",  e);
                    }

                    // create legacy CliqzUtils global
                    runtime.executeVoidScript("var CliqzUtils = {}; System.import(\"core/utils\").then(function(mod) { CliqzUtils = mod.default; });");

                    // pref config
                    setPref(runtime, "antiTrackTest", support.isAntiTrackTestEnabled());
                    setPref(runtime, "attrackForceBlock", support.isForceBlockEnabled());
                    setPref(runtime, "attrackBloomFilter", support.isBloomFilterEnabled());
                    setPref(runtime, "attrackDefaultAction", support.getDefaultAction());

                    // enable adblock by default
                    try {
                        runtime.executeBooleanScript(String.format("CliqzUtils.getPref(\"%s\");", ADBLOCK_ABTEST_PREF_NAME));
                    } catch (V8ResultUndefined e) {
                        // no value set for pref: set default
                        setPref(runtime, ADBLOCK_ABTEST_PREF_NAME, ADBLOCK_ABTEST_DEFAULT);
                        setPref(runtime, ADBLOCK_PREF_NAME, ADBLOCK_PREF_DEFAULT);
                    }

                    // startup
                    runtime.executeVoidScript("System.import(\"platform/startup\").then(function(startup) { startup.default() }).catch(function(e) { logDebug(e, \"xxx\"); });");

                    // get webrequest object
                    mWebRequest = runtime.executeObjectScript("System.get(\"platform/webrequest\").default");
                    return null;
                }

            });
        } catch(InterruptedException | ExecutionException e) {
            Log.e(TAG, Log.getStackTraceString(e));
        }
    }

    public boolean isEnabled() {
        return mEnabled || mAdblockEnabled;
    }

    public void setEnabled(final boolean value) {
        this.mEnabled = value;
        try {
            v8.asyncQuery(new V8Engine.Query<Object>() {
                public Object query(V8 runtime) {
                    setPref(runtime, "antiTrackTest", value);
                    return null;
                }
            });
        } catch (InterruptedException | ExecutionException e) {
            Log.e(TAG, "Failed to toggle anti-tracking on/off", e);
        }
    }

    public void setAdblockEnabled(final boolean value) {
        this.mAdblockEnabled = value;
        try {
            v8.asyncQuery(new V8Engine.Query<Object>() {
                public Object query(V8 runtime) {
                    setPref(runtime, ADBLOCK_ABTEST_PREF_NAME, value);
                    setPref(runtime, ADBLOCK_PREF_NAME, value ? 1 : 0);
                    return null;
                }
            });
        } catch (InterruptedException | ExecutionException e) {
            Log.e(TAG, "Failed to toggle adblock on/off", e);
        }
    }

    private void setPref(V8 runtime, String preference, Object value) {
        final String valueAsString;
        if (value == null) {
            valueAsString = "null";
        } else if (String.class.isInstance(value)) {
            valueAsString = String.format("\"%s\"", value);
        } else {
            valueAsString = value.toString();
        }
        final String javascript = String.format("CliqzUtils.setPref(\"%s\", %s);",
                preference, valueAsString);
        runtime.executeVoidScript(javascript);
    }

    public WebResourceResponse shouldInterceptRequest(final WebView view, final WebResourceRequest request) {
        if (!isEnabled()) {
            return null;
        }

        final boolean isMainDocument = request.isForMainFrame();
        final Uri requestUrl = request.getUrl();

        // save urls for tab - no action for main document requests
        if ( isMainDocument ) {
            final int tabId = view.hashCode();
            tabs.put(tabId, Pair.create(requestUrl, new WeakReference<WebView>(view)));

            // clean up dead tabs
            for (Iterator<Map.Entry<Integer, Pair<Uri, WeakReference<WebView>>>> it = tabs.entrySet().iterator(); it.hasNext();) {
                Map.Entry<Integer, Pair<Uri, WeakReference<WebView>>> e = it.next();
                if (e.getValue().second.get() == null) {
                    it.remove();
                }
            }
        }

        if (mWebRequest == null) {
            // antitracking not finished initialising, skip v8 query
            return null;
        }

        String block = "{}";
        try {
            block = v8.queryEngine(new V8Engine.Query<String>() {
                @Override
                public String query(V8 runtime) {
                    V8Object blockingResponse = null;
                    // build request metadata object
                    V8Object requestInfo = new V8Object(runtime);
                    requestInfo.add("url", requestUrl.toString());
                    requestInfo.add("method", request.getMethod());
                    requestInfo.add("tabId", view.hashCode());
                    requestInfo.add("parentFrameId", -1);
                    requestInfo.add("frameId", view.hashCode());
                    requestInfo.add("isPrivate", false);
                    requestInfo.add("originUrl", isMainDocument ? requestUrl.toString() : tabs.get(view.hashCode()).first.toString());

                    // simple content type detection
                    int contentPolicyType = 11; // default is XMLHttpRequest
                    if (isMainDocument) {
                        contentPolicyType = 6;
                    } else if (requestUrl.toString().endsWith(".js")) {
                        contentPolicyType = 2;
                    }

                    requestInfo.add("type", contentPolicyType);

                    V8Object requestHeaders = new V8Object(runtime);
                    for(Map.Entry<String, String> e : request.getRequestHeaders().entrySet()) {
                        requestHeaders.add(e.getKey(), e.getValue());
                    }
                    requestInfo.add("requestHeaders", requestHeaders);

                    V8Array webRequestArgs = new V8Array(runtime);
                    V8Array stringifyArgs = new V8Array(runtime);
                    V8Object webRequestEntry = mWebRequest.getObject("onBeforeRequest");
                    V8Object json = runtime.getObject("JSON");

                    try {
                        // query engine for action
                        blockingResponse = webRequestEntry.executeObjectFunction("_trigger", webRequestArgs.push(requestInfo));
                        // stringify response object
                        return json.executeStringFunction("stringify", stringifyArgs.push(blockingResponse));
                    } catch(V8ResultUndefined e) {
                        return "{}";
                    } catch(V8ScriptExecutionException e) {
                        Log.e("CliqzAntiTracking", "error in webrequests", e);
                        return "{}";
                    } finally {
                        // release handles for V8 objects we created
                        if (blockingResponse != null)
                            blockingResponse.release();
                        requestInfo.release();
                        webRequestArgs.release();
                        stringifyArgs.release();
                        webRequestEntry.release();
                        json.release();
                    }
                }
            }, 200);
        } catch(InterruptedException | ExecutionException e) {
            Log.e(TAG, Log.getStackTraceString(e));
        } catch(TimeoutException e) {
            Log.e(TAG, "Query timeout: "+ requestUrl.toString());
            block = "{}";
        }

        try {
            JSONObject blockResponse = new JSONObject(block);
            if (blockResponse.has("cancel") && blockResponse.getBoolean("cancel")) {
                Log.d(TAG, "Block request: " + requestUrl.toString());
                return blockRequest();
            } else if(blockResponse.has("redirectUrl") || blockResponse.has("requestHeaders")) {
                String newUrl;
                if (blockResponse.has("redirectUrl")) {
                    newUrl = blockResponse.getString("redirectUrl");
                } else {
                    newUrl = requestUrl.toString();
                }
                Map<String, String> modifiedHeaders = new HashMap<>();
                if (blockResponse.has("requestHeaders")) {
                    JSONArray headers = blockResponse.getJSONArray("requestHeaders");
                    for (int i=0; i<headers.length(); i++ ) {
                        JSONObject header = headers.getJSONObject(i);
                        modifiedHeaders.put(header.getString("name"), header.getString("value"));
                    }
                }
                Log.d(TAG, "Modify request from: " + requestUrl.toString());
                //Log.d(TAG, "                 to: " + newUrl);
                return modifyRequest(request, newUrl, modifiedHeaders);
            }
        } catch(JSONException e) {
            Log.e(TAG, "Bad data from JS: " + block, e);
        }

        return null;
    }

    public WebResourceResponse shouldInterceptRequest(final WebView view, Uri url) {
        // from old API level
        return null;
    }

    WebResourceResponse modifyRequest(WebResourceRequest request, String newUrlString, Map<String, String> modifyHeaders) {
        HttpURLConnection connection = null;
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


            Log.d(TAG, "Redirect to: "+ newUrlString);
            connection.connect();
            final WebResourceResponse response = new WebResourceResponse(connection.getContentType(), connection.getContentEncoding(), connection.getInputStream());
            response.setStatusCodeAndReasonPhrase(connection.getResponseCode(), connection.getResponseMessage());
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
            return blockRequest();
        } catch (IllegalArgumentException | IOException e) {
            Log.e(TAG, "Could not redirect: " + e.getMessage());
            return blockRequest();
        }
    }

    WebResourceResponse blockRequest() {
        return new WebResourceResponse("text/html", "UTF-8", StreamUtils.createEmptyStream());
    }

    /**
     * Get information about requests blocked/redirected for a tab.
     * @param tabId ID of the tab to get information about (equals hashcode of webview)
     * @return  JSONObject containing blocking metadata
     */
    public JSONObject getTabBlockingInfo(final int tabId) {
        try {
            final String tabInfoJson = v8.queryEngine(new V8Engine.Query<String>() {
                public String query(V8 runtime) {
                    return runtime.executeStringScript("JSON.stringify(System.get('antitracking/attrack').default.getTabBlockingInfo(" + tabId + "));");
                }
            });
            return new JSONObject(tabInfoJson);
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            Log.e("attrack", "getTabBlockingInfo error", e);
        } catch (JSONException e) {
            // shouldn't happen - the parsed json comes directly from JSON.stringify in JS
            throw new RuntimeException(e);
        }
        // on failure return empty object
        return new JSONObject();
    }
}
