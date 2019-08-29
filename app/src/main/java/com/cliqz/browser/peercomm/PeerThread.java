package com.cliqz.browser.peercomm;

import android.os.Handler;

import timber.log.Timber;


/**
 * @author  Stefano Pacifici
 */
class PeerThread extends Thread {

    private PeerWebView mPeerWebView;
    private final Handler handler;

    PeerThread(final PeerCommunicationService service) {
        handler = new Handler(service.getMainLooper());
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView = new PeerWebView(service);
            }
        });
    }

    @Override
    public void run() {
        try {
            synchronized (this) {
                wait();
            }
        } catch (InterruptedException e) {
            Timber.i("PeerThread stopped");
        }
    }

    void sendPeerInfo(final String peerInfo) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView.sendPeerInfo(peerInfo);
            }
        });
    }

    void requestPairingData() {
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView.requestPairingData();
            }
        });
    }

    void unpairDevice(final String peerId) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView.unpairDevice(peerId);
            }
        });
    }

    void renameDevice(final String peerId, final String newName) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView.renameDevice(peerId, newName);
            }
        });
    }

    public void sendTabTo(final String peerId, final String url, final String title, final boolean isIncognito) {
        handler.post(new Runnable() {
            @Override
            public void run() {
                mPeerWebView.sendTabTo(peerId, url, title, isIncognito);
            }
        });
    }
}
