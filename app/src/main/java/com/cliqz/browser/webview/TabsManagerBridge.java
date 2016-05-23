package com.cliqz.browser.webview;

import android.app.Activity;
import android.support.annotation.NonNull;
import android.util.Log;

import com.cliqz.browser.bus.TabManagerEvents;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

/**
 * @author Stefano Pacifici
 * @date 2015/11/13
 */
class TabsManagerBridge extends Bridge {

    public TabsManagerBridge(Activity activity) {
        super(activity);
    }

    private static final String TAG = TabsManagerBridge.class.getSimpleName();

    enum Action implements IAction {
        onReady(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final TabsManagerView view = (TabsManagerView) bridge.getWebView();
                final StringBuilder builder = new StringBuilder();
                builder.append("main(").append(view.openTabsToJSON()).append(")");
                bridge.executeJavascript(builder.toString());
            }
        }),

        deleteTabs(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                // Callback is ignored here, we are using the bus and this is the simplest way
                final JSONObject object = data instanceof JSONObject ? (JSONObject) data : null;
                final JSONArray list = object != null ? object.optJSONArray("list") : null;
                if (list == null || list.length() == 0) {
                    return;
                }
                final int tabsNo = list.length();
                final ArrayList<String> toBeDeleted = new ArrayList<>(tabsNo);
                try {
                    for (int i = 0; i < tabsNo; i++) {
                            toBeDeleted.add(list.getJSONObject(i).getString("id"));
                    }
                    ((TabsManagerView) bridge.getWebView())
                            .mTabManagerBus.post(new TabManagerEvents.CloseTab(toBeDeleted));
                } catch (JSONException e) {
                    Log.e(TAG, "Can't parse json", e);
                }
            }
        }),

        openLink(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                final String id = data instanceof String ? (String) data : null;
                if (id == null) {
                    Log.w(TAG, "Can't open the given id");
                    return;
                }
                ((TabsManagerView) bridge.getWebView())
                        .mTabManagerBus.post(new TabManagerEvents.OpenTab(id));
            }
        }),

        goBack(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                ((TabsManagerView) bridge.getWebView())
                        .mTabManagerBus.post(new TabManagerEvents.ExitTabManager());
            }
        }),

        none(new IAction() {
            @Override
            public void execute(Bridge bridge, Object data, String callback) {
                throw new RuntimeException("none is not an action");
            }
        });

        private final IAction action;

        Action(IAction action) {
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
