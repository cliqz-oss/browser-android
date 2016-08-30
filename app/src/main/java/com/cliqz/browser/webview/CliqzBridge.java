package com.cliqz.browser.webview;

import android.app.Activity;
import android.content.Intent;
import android.support.annotation.NonNull;
import android.util.Log;

import com.cliqz.browser.main.Messages;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Locale;

import acr.browser.lightning.database.HistoryDatabase;

/**
 * @author Stefano Pacifici
 * @date 2015/11/09
 */
public class CliqzBridge extends Bridge {

    private static final String TAG = CliqzBridge.class.getSimpleName();

    public CliqzBridge(Activity activity) {
        super(activity);
    }

    private enum Action implements IAction {

        /**
         * Search through the browser history
         *
         * TODO Is it used, can it not be more generic and not SearchWebView dependant?
         */
        searchHistory(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String query = (data instanceof String) ? (String) data: null;
                if (callback == null || callback.isEmpty() || query == null) {
                    Log.e(TAG, "Can't perform searchHistory without a query and/or a callback");
                    return; // Nothing to do without callback or data
                }

                if (query != null && !query.isEmpty()) {
                    final JsonArray items = bridge.historyDatabase.findItemsContaining(query, 50);
                    final String callbackCode = buildItemsCallback(callback, query, items);
                    bridge.executeJavascript(callbackCode);
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

        getFavorites(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                if (callback == null || callback.isEmpty()) {
                    Log.e(TAG, "Can't perform getFavorites without a callback");
                    return;
                }
                final JsonArray items = bridge.historyDatabase.getFavorites();
                final String callbackCode = buildItemsCallback(callback, "", items);
                bridge.executeJavascript(String.format("%s(%s)", callback,items.toString()));
            }
        }),

        setFavorites(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
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
                        bridge.historyDatabase.setFavorites(url, favTime, isFavorite);
                    }
                }
            }
        }),

        getHistoryItems(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final JSONObject jsonObject = (data instanceof JSONObject) ? (JSONObject) data : new JSONObject();
                if (callback == null || callback.isEmpty()) {
                    Log.e(TAG, "Can't perform getHistoryItems without a callback");
                    return;
                }

                final int start = jsonObject.optInt("start", 0);
                final int end = jsonObject.optInt("end", bridge.historyDatabase.getHistoryItemsCount());

                final JsonArray items = bridge.historyDatabase.getHistoryItems(start, end);
                final String callbackCode = buildItemsCallback(callback, "", items);
                bridge.executeJavascript(String.format("%s(%s)", callback,items.toString()));
            }
        }),

        /**
         * Remove multiple items from the history
         * Javascript example: removeHistory([id1, id2, id3, ...])
         */
        removeHistoryItems(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
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
        isReady(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                bridge.bus.post(new Messages.HideLoadingScreen());
                bridge.getWebView().extensionReady();
                bridge.executeJavascript(String.format(Locale.US,  "%s(-1)", callback));
            }
        }),

        /**
         * Generally fired when the user tap on search result
         */
        openLink(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String url = (data instanceof String) ? (String) data : null;
                if (url != null) {
                    bridge.bus.post(new CliqzMessages.OpenLink(url));
                }
            }
        }),

        /**
         * The extension asks to handle the message with an external app (if available)
         */
        browserAction(new IAction() {
            @Override
            public void execute(final Bridge bridge, Object data, String callback) {
                final JSONObject params = (data instanceof JSONObject) ? (JSONObject) data : null;
                final BaseWebView webView = bridge.getWebView();
                final String dataPar = params != null ? params.optString("data") : null;
                final String typePar = params != null ? params.optString("type") : null;
                if (dataPar == null || typePar == null) {
                    Log.e(TAG, "Can't parse the action");
                    return;
                }

                final BrowserActionTypes action = BrowserActionTypes.fromTypeString(typePar);
                final Intent intent = action.getIntent(webView.getContext(), dataPar);
                if (intent != null) {
                    webView.getContext().startActivity(intent);
                }
            }
        }),

        getTopSites(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final int no = data instanceof Integer ? (Integer) data : 5;
                if (callback == null) {
                    Log.e(TAG, "Can't perform getTopSites without a callback");
                    return; // Nothing to do without callback or data
                }
                final HistoryDatabase history = ((BaseWebView) bridge.getWebView()).historyDatabase;
                String result = "[]";
                if (history != null) {
                    final JsonArray items = history.getTopSites(no);
                        result = items.toString();
                }
                final String js = String.format("%s(%s)", callback, result);
                bridge.executeJavascript(js);
            }
        }),

        autocomplete(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String url = (data instanceof String) ? (String) data : null;
                if (url == null) {
                    Log.w(TAG, "No url for autocompletion");
                    return;
                }
                bridge.bus.post(new CliqzMessages.Autocomplete(url));
            }
        }),

        notifyQuery(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final JSONObject json = (data instanceof JSONObject) ? (JSONObject) data : null;
                final String query = json != null ? json.optString("q", null): null;
                if (query == null) {
                    Log.w(TAG, "No url to notify");
                    return;
                }
                bridge.bus.post(new CliqzMessages.NotifyQuery(query));
            }
        }),

        pushTelemetry(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final JSONObject signal = (data instanceof JSONObject) ? (JSONObject) data : null;
                bridge.telemetry.saveExtSignal(signal);
            }
        }),

        copyResult(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String copiedData = (data instanceof String) ? (String) data : null;
                if(copiedData != null) {
                    bridge.bus.post(new CliqzMessages.CopyData(copiedData));
                }
            }
        }),

        shareCard(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String cardLink = (data instanceof String) ? (String) data : null;
                if (cardLink == null) {
                    Log.w(TAG, "Expect either url or -1");
                    return;
                }
                bridge.bus.post(new Messages.ShareCard(cardLink));
            }
        }),

        notifyYoutubeVideoUrls(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final JSONArray json = (data instanceof JSONArray) ? (JSONArray) data: new JSONArray();
                bridge.bus.post(new Messages.SetVideoUrls(json));
            }
        }),

        none(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                throw new RuntimeException("Invalid action invoked");
            }
        });

        private static String buildItemsCallback(String callback, String query, JsonArray items) {
            final JsonObject result = new JsonObject();
            result.add("results", items);
            if (query != null) {
                result.addProperty("query", query);
            }
            return String.format("%s(%s)", callback,result.toString());
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
}
