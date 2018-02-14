package com.cliqz.browser.peercomm;

import android.annotation.SuppressLint;
import android.os.Handler;
import android.os.Looper;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.AbstractionWebView;
import com.cliqz.jsengine.ActionNotAvailable;
import com.cliqz.jsengine.EmptyResponseException;
import com.cliqz.jsengine.Engine;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import javax.inject.Inject;

/**
 * @author Stefano Pacifici
 * @author Moaz Rashad
 */
@SuppressLint("ViewConstructor")
public class PeerWebView extends AbstractionWebView {

    private final Handler handler;
    @SuppressWarnings({"FieldCanBeLocal", "unused"})
    private final PeerCommunicationService service;

    @Inject
    Engine jsEngine;

    public PeerWebView(PeerCommunicationService service) {
        super(service);
        this.service = service;
        this.handler = new Handler(Looper.getMainLooper());
        BrowserApp.getAppComponent().inject(this);
        setup();
    }

    @Override
    protected void setup() {
        super.setup();
        onResume();
    }

    public final void sendPeerInfo(final String peerInfo) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    jsEngine.getBridge().callAction("mobile-pairing:receiveQRValue", peerInfo);
                } catch (ActionNotAvailable | EmptyResponseException | EngineNotYetAvailable e) {
                    e.printStackTrace();
                }
            }
        });
    }

    public void requestPairingData() {
        try {
            jsEngine.getBridge().callAction("mobile-pairing:requestPairingData");
        } catch (ActionNotAvailable | EmptyResponseException | EngineNotYetAvailable e) {
            e.printStackTrace();
        }
    }

    public void unpairDevice(final String peerId) {
        try {
            jsEngine.getBridge().callAction("mobile-pairing:unpairDevice", peerId);
        } catch (ActionNotAvailable | EmptyResponseException | EngineNotYetAvailable e) {
            e.printStackTrace();
        }
    }

    public void renameDevice(final String peerId, final String newName) {
        try {
            jsEngine.getBridge().callAction("mobile-pairing:renameDevice", peerId, newName);
        } catch (ActionNotAvailable | EmptyResponseException | EngineNotYetAvailable e) {
            e.printStackTrace();
        }
    }

    @SuppressWarnings("UnusedParameters")
    public void sendTabTo(final String peerId, final String url, final String title, final boolean isIncognito) {
        try {
            final WritableArray tabs = Arguments.createArray();
            final WritableMap map = Arguments.createMap();
            map.putString("url", url);
            map.putString("title", title);
            map.putBoolean("isPrivate", isIncognito);
            tabs.pushMap(map);
            jsEngine.getBridge().callAction("mobile-pairing:sendTabs", peerId, tabs);
        } catch (ActionNotAvailable | EmptyResponseException | EngineNotYetAvailable e) {
            e.printStackTrace();
        }
    }
}
