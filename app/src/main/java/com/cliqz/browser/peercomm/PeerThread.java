package com.cliqz.browser.peercomm;

import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;

import io.sentry.Sentry;
import io.sentry.event.EventBuilder;
import timber.log.Timber;


/**
 * @author  Stefano Pacifici
 */
class PeerThread extends Thread {

    private PeerWebView mPeerWebView = null;
    private Handler handler;

    PeerThread(@NonNull Context context) {
        try {
            mPeerWebView = new PeerWebView(context);
        } catch (Throwable e) {
            Timber.e(e, "Can't create the PeerThread");
            final EventBuilder builder = new EventBuilder();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                builder.withMessage("Failed to create the PeerThread: " +
                        Application.getProcessName());
            } else {
                builder.withMessage("Failed to create the PeerThread");
            }
            builder.withExtra("throwable", e);
            Sentry.capture(builder);
        }
    }

    @Override
    public void run() {
        Looper.prepare();
        handler = new Handler();
        Looper.loop();
    }

    void sendPeerInfo(final String peerInfo) {
        handler.post(() ->  {
            if (mPeerWebView != null) mPeerWebView.sendPeerInfo(peerInfo);
        });
    }

    void requestPairingData() {
        handler.post(() -> {
            if (mPeerWebView != null) mPeerWebView.requestPairingData();
        });
    }

    void unpairDevice(final String peerId) {
        handler.post(() -> {
            if (mPeerWebView != null) mPeerWebView.unpairDevice(peerId);
        });
    }

    void renameDevice(final String peerId, final String newName) {
        handler.post(() -> {
            if (mPeerWebView != null) mPeerWebView.renameDevice(peerId, newName);
        });
    }

    void sendTabTo(final String peerId,
                   final String url,
                   final String title,
                   final boolean isIncognito) {
        handler.post(() -> {
            if (mPeerWebView != null) mPeerWebView.sendTabTo(peerId, url, title, isIncognito);
        });
    }
}
