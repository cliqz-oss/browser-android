package com.cliqz.browser.main;

import android.os.Handler;

import com.cliqz.jsengine.JSBridge;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReadableMap;

import org.json.JSONException;
import org.json.JSONObject;

import acr.browser.lightning.utils.Utils;

/**
 * @author Moaz Rashad
 */

public class JSYTDownloadCallback implements JSBridge.Callback,Runnable {

    private static final String TAG = JSYTDownloadCallback.class.getSimpleName();

    private JSONObject mData = null;
    private final Handler handler;

    Bus bus;
    public JSYTDownloadCallback(Bus bus,Handler handler) {
        this.bus = bus;
        this.handler = handler;
    }

    @Override
    public void callback(ReadableMap data) {
        try {
            mData = Utils.convertMapToJson(data.getMap("result"));
            handler.post(this);
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void run() {
        try {
            bus.post(new Messages.SetVideoUrls(mData.getJSONArray("formats")));
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
