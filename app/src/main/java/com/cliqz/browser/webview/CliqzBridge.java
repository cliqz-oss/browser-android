package com.cliqz.browser.webview;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Message;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.ConfirmSubscriptionDialog;
import com.cliqz.browser.utils.EnableNotificationDialog;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.nove.Bus;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 */
public class CliqzBridge extends Bridge {

    private static final String TAG = CliqzBridge.class.getSimpleName();

    private final ExtensionCallerThread callerThread;

    private final JavascriptCallbackRegistry callbackRegistry = new JavascriptCallbackRegistry();

    private final Telemetry telemetry;

    public final Bus bus;

    private final HistoryDatabase historyDatabase;

    private final SubscriptionsManager subscriptionManager;
    private final PreferenceManager preferenceManager;

    // Bus bus, HistoryDatabase historyDatabase, Telemetry telemetry

    CliqzBridge(BaseWebView webView, Bus bus, HistoryDatabase historyDatabase,
                SubscriptionsManager subscriptionsManager, Telemetry telemetry,
                PreferenceManager preferenceManager) {
        super();

        this.bus = bus;
        this.historyDatabase = historyDatabase;
        this.subscriptionManager = subscriptionsManager;
        this.telemetry = telemetry;
        this.preferenceManager = preferenceManager;
        setWebView(webView);

        this.callerThread = new ExtensionCallerThread(this);
        this.callerThread.setDaemon(true);
        this.callerThread.start();
    }

    private enum Action implements IAction {

        /**
         * Search through the browser history
         *
         * TODO Is it used, can it not be more generic and not SearchWebView dependant?
         */
        searchHistory(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final String query = (data instanceof String) ? (String) data: null;
                if (callback == null || callback.isEmpty() || query == null) {
                    Log.e(TAG, "Can't perform searchHistory without a query and/or a callback");
                    return; // Nothing to do without callback or data
                }

                if (!query.isEmpty()) {
                    final JSONArray items = bridge.historyDatabase.findItemsContaining(query, 50);
                    final JSONObject result = addQueryToItems(query, items);
                    bridge.executeJavascriptCallback(callback, result);
                } else {
                    // Back compatibility
                    // TODO This fallback should be removed when the JS bridge will use pagination
                    try {
                        final JSONObject params = new JSONObject().put("start", 0).put("end", 50);
                        getHistoryItems.execute(bridge, params, callback);
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            }
        }),

        getFavorites(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                if (callback == null || callback.isEmpty()) {
                    Log.e(TAG, "Can't perform getFavorites without a callback");
                    return;
                }
                final JSONArray items = bridge.historyDatabase.getFavorites();
                bridge.executeJavascriptCallback(callback, items);
            }
        }),

        setFavorites(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject jsonObject = (data instanceof JSONObject) ? (JSONObject) data : new JSONObject();
                if (!jsonObject.has("favorites")) {
                    Log.e(TAG, "Can't set favorites. Request is empty");
                }
                final JSONArray favoritesList = jsonObject.optJSONArray("favorites");
                final boolean isFavorite = jsonObject.optBoolean("value", false);
                if (favoritesList == null) {
                    return;
                }
                for (int i = 0; i < favoritesList.length(); i++) {
                    JSONObject favoriteItem = favoritesList.optJSONObject(i);
                    if (favoriteItem != null) {
                        final String url = favoriteItem.optString("url");
                        final long favTime = favoriteItem.optLong("timestamp", -1);
                        if (url == null) {
                            continue;
                        }
                        bridge.historyDatabase.setFavorites(url, null, favTime, isFavorite);
                    }
                }
            }
        }),

        getHistoryItems(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject jsonObject = (data instanceof JSONObject) ? (JSONObject) data : new JSONObject();
                if (callback == null || callback.isEmpty()) {
                    Log.e(TAG, "Can't perform getHistoryItems without a callback");
                    return;
                }

                final int offset = jsonObject.optInt("offset", 0);
                 final int limit = jsonObject.optInt("limit", bridge.historyDatabase.getHistoryItemsCount());

                final JSONArray items = bridge.historyDatabase.getHistoryItems(offset, limit);
                bridge.executeJavascriptCallback(callback, items);
            }
        }),

        /**
         * Remove multiple items from the history
         * Javascript example: removeHistory([id1, id2, id3, ...])
         */
        removeHistoryItems(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONArray json = (data instanceof JSONArray) ? (JSONArray) data : null;
                final int size = json != null ? json.length() : 0;
                for (int i = 0; i < size; i++ ) {
                    final long id = json.optLong(i, -1);
                    if (i > -1) {
                        bridge.historyDatabase.deleteHistoryPoint(id);
                    }
                }
            }
        }),

        /**
         * The extension notify it is ready
         */
        isReady(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                bridge.postExtensionReady();
//                bridge.getWebView().extensionReady();
            }
        }),

        /**
         * Remove the loading screen
         */
        freshtabReady(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                // TODO Find a solution for this
            }
        }),

        /**
         * Generally fired when the user tap on search result
         */
        openLink(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final String url = (data instanceof String) ? (String) data : null;
                if (url != null) {
                    bridge.bus.post(CliqzMessages.OpenLink.open(url));
                }
            }
        }),

        /**
         * The extension asks to handle the message with an external app (if available)
         */
        browserAction(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject params = (data instanceof JSONObject) ? (JSONObject) data : null;
                final AbstractionWebView webView = bridge.getWebView();
                final String dataPar = params != null ? params.optString("data") : null;
                final String typePar = params != null ? params.optString("type") : null;
                if (dataPar == null || typePar == null) {
                    Log.e(TAG, "Can't parse the action");
                    return;
                }

                final BrowserActionTypes action = BrowserActionTypes.fromTypeString(typePar);
                switch (action) {
                    case map:
                        bridge.bus.post(CliqzMessages.OpenLink.open(dataPar));
                        break;
                    default:
                        final Intent intent = action.getIntent(webView.getContext(), dataPar);
                        if (intent != null) {
                            webView.getContext().startActivity(intent);
                        }
                        break;
                }
            }
        }),

        getTopSites(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                bridge.executeJavascriptCallback(callback, new JSONArray());
            }
        }),

        autocomplete(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final String url = (data instanceof String) ? (String) data : null;
                if (url == null) {
                    Log.w(TAG, "No url for autocompletion");
                    return;
                }
                bridge.bus.post(new CliqzMessages.Autocomplete(url));
            }
        }),

        notifyQuery(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject json = (data instanceof JSONObject) ? (JSONObject) data : null;
                final String query = json != null ? json.optString("q", null): null;
                if (query == null) {
                    Log.w(TAG, "No url to notify");
                    return;
                }
                bridge.bus.post(new CliqzMessages.NotifyQuery(query));
            }
        }),

        pushTelemetry(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject signal = (data instanceof JSONObject) ? (JSONObject) data : null;
                bridge.telemetry.saveExtSignal(signal);
            }
        }),

        copyResult(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final String copiedData = (data instanceof String) ? (String) data : null;
                if(copiedData != null) {
                    bridge.bus.post(new CliqzMessages.CopyData(copiedData));
                }
            }
        }),

        shareCard(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONObject cardDetails = (data instanceof JSONObject) ? (JSONObject) data : null;
                if (cardDetails == null) {
                    Log.w(TAG, "Expect either url or -1");
                    return;
                }
                bridge.bus.post(new Messages.ShareCard(cardDetails));
            }
        }),

        notifyYoutubeVideoUrls(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                final JSONArray json = (data instanceof JSONArray) ? (JSONArray) data: new JSONArray();
                bridge.bus.post(new Messages.SetVideoUrls(json));
            }
        }),

        pushJavascriptResult(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                if (data instanceof JSONObject) {
                    final JSONObject result = JSONObject.class.cast(data);
                    try {
                        final int ref = result.getInt("ref");
                        final Object resultData = result.opt("data");
                        bridge.callJavascriptResultHandler(ref, resultData);
                    } catch (JSONException e) {
                        Log.e(TAG, "Can't find any callback reference", e);
                    }
                }
            }
        }),

        showQuerySuggestions(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                // with a dictionary as an argument {`query` as string, `suggestions` as array of strings}
                if (!JSONObject.class.isInstance(data)) {
                    return;
                }
                final JSONObject jsonObject = JSONObject.class.cast(data);
                final String query = jsonObject.optString("query");
                final JSONArray suggestions = jsonObject.optJSONArray("suggestions");
                if (query != null && suggestions != null) {
                    // convert json array to list
                    final String[] list = new String[suggestions.length()];
                    for (int i = 0; i < suggestions.length(); i++) {
                        final String s = suggestions.optString(i);
                        if (s != null) { list[i] = s; }
                    }
                    bridge.bus.post(new Messages.QuerySuggestions(query, list));
                }
            }
        }),

        subscribeToNotifications(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                if (!JSONObject.class.isInstance(data)) {
                    return;
                }
                final JSONObject jsonObject = JSONObject.class.cast(data);
                final String type = jsonObject.optString("type");
                final String subType = jsonObject.optString("subtype");
                final String id = jsonObject.optString("id");
                final Context context = bridge.getWebView().getContext();
                if (type == null || subType == null || id == null ||
                        EnableNotificationDialog.showIfNeeded(context, bridge.telemetry) != null) {
                    return;
                }

                if (!bridge.preferenceManager.isFirstSubscription()) {
                    bridge.subscriptionManager.addSubscription(type, subType, id);
                    bridge.bus.post(new Messages.NotifySubscription());
                } else {
                    ConfirmSubscriptionDialog.show(bridge.getWebView().getContext(), bridge.bus,
                            bridge.subscriptionManager, bridge.telemetry, new CliqzMessages.Subscribe(type, subType, id, null));
                    bridge.preferenceManager.setFirstSubscription(false);
                }
            }
        }),

        unsubscribeToNotifications(new EnhancedAction<CliqzBridge>() {
            @Override
            protected void enhancedExecute(CliqzBridge bridge, Object data, String callback) {
                if (!JSONObject.class.isInstance(data)) {
                    return;
                }
                final JSONObject jsonObject = JSONObject.class.cast(data);
                final String type = jsonObject.optString("type");
                final String subType = jsonObject.optString("subtype");
                final String id = jsonObject.optString("id");
                if (type != null && subType != null && id != null) {
                    bridge.subscriptionManager.removeSubscription(type, subType, id);
                    bridge.bus.post(new Messages.NotifySubscription());
                }
            }
        }),

        none(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                throw new RuntimeException("Invalid action invoked");
            }
        });

        private static JSONObject addQueryToItems(String query, JSONArray items) {
            final JSONObject result = new JSONObject();
            try {
                result.put("results", items);
                if (query != null) {
                    result.put("query", query);
                }
            } catch (JSONException e) {
                Log.e(TAG, "Error: ", e);
            }
            return result;
        }

        private final IAction action;

        Action(final IAction action) {
            this.action = action;
        }

        @Override
        public void execute(Bridge bridge, Object data, String callback) {
            action.execute(bridge, data, callback);
        }
    }

    private void postExtensionReady() {
        final Handler handler = callerThread.getHandler();
        handler.sendEmptyMessage(R.id.msg_extension_ready);
    }

    private void callJavascriptResultHandler(int ref, Object data) {
        final JavascriptResultHandler callback =
                callbackRegistry.remove(ref);

        if (callback != null) {
            callback.onJavascriptResult(data);
        }
    }

    @Override
    protected void inject(Context context) {
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    protected IAction safeValueOf(@NonNull String name) {
        try {
            return Action.valueOf(name);
        } catch (IllegalArgumentException e) {
            Log.e(TAG, "Can't convert the given name to Action: " + name, e);
            return Action.none;
        }
    }

    @Override
    protected boolean checkCapabilities() {
        return true;
    }


    private void appendJavascriptParam(StringBuilder builder, Object param) {
        if (param instanceof String) {
            builder.append('"').append((String) param).append('"');
        } else if (param instanceof Integer) {
            builder.append((int) param);
        } else if (param instanceof JSONObject || param instanceof JSONArray) {
            builder.append(param.toString());
        } else {
            builder.append(param.toString());
        }
    }

    public final void executeJavascriptFunction(@Nullable JavascriptResultHandler jsResHandler,
                                        @NonNull String functionName,
                                        @Nullable Object... params) {
        final StringBuilder scriptBuilder = new StringBuilder();
        scriptBuilder.append(functionName).append("(");
        if (params != null && params.length > 0) {
            appendJavascriptParam(scriptBuilder, params[0]);
            for (int i = 1; i < params.length; i++) {
                scriptBuilder.append(",");
                appendJavascriptParam(scriptBuilder, params[i]);
            }
        }
        scriptBuilder.append(");");

        executeJavascript(jsResHandler, scriptBuilder.toString());
    }

    private void executeJavascript(@Nullable JavascriptResultHandler jsResHandler,
                                        @NonNull String script) {
        final Handler handler = callerThread.getHandler();
        final StringBuilder builder = new StringBuilder();
        builder.append( "(function(handlerRef) {")
                .append("var result = null;")
                .append("try {")
                .append("  result = ")
                .append(script)
                .append("  if (handlerRef) osAPI.pushJavascriptResult(handlerRef, result);")
                .append("} catch (err) {}")
                .append("})(");
        if (jsResHandler != null) {
            builder.append(jsResHandler.hashCode());
            // Add the reference to the callback registry
            callbackRegistry.add(jsResHandler);
        }
        builder.append(")");


        final Message message = handler.obtainMessage(R.id.msg_execute_javascript_function);
        message.obj = builder.toString();
        handler.sendMessage(message);
    }

}
