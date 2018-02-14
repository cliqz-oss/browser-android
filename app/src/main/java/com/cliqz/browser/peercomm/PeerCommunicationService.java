package com.cliqz.browser.peercomm;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Binder;
import android.os.IBinder;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Log;

public class PeerCommunicationService extends Service {

    private static final String TAG = PeerCommunicationService.class.getSimpleName();

    private class PeerCommunicationServiceBinder extends Binder {
        PeerCommunicationService getService() {
            return PeerCommunicationService.this;
        }
    }

    private final IBinder binder = new PeerCommunicationServiceBinder();

    private enum PeerThreadReference {
        INSTANCE;

        private PeerThread thread = null;

        synchronized void startPeer(PeerCommunicationService service) {
            if (thread != null) {
                Log.w(TAG, "Can't start two peer thread");
                return;
            }
            thread = new PeerThread(service);
            thread.start();
        }

        synchronized void stopPeer() {
            if (thread == null) {
                Log.w(TAG, "No peer thread running");
                return;
            }

            thread.interrupt();
            thread = null; // Otherwise you can not start it anymore
        }

        void sendPeerInfo(PeerCommunicationService service, String peerInfo) {
            ensurePeerStarted(service);
            thread.sendPeerInfo(peerInfo);
        }

        public void disconnectDevice(PeerCommunicationService service, @NonNull String peerId) {
            ensurePeerStarted(service);
            thread.unpairDevice(peerId);
        }

        public void requestPairingData(PeerCommunicationService peerCommunicationService) {
            ensurePeerStarted(peerCommunicationService);
            thread.requestPairingData();
        }

        public void renameDevice(PeerCommunicationService service, @NonNull String peerId, @NonNull String newName) {
            ensurePeerStarted(service);
            thread.renameDevice(peerId, newName);
        }

        private void ensurePeerStarted(PeerCommunicationService service) {
            if (thread == null || thread.isInterrupted()) {
                startPeer(service);
            }
        }

        public void sendTabTo(PeerCommunicationService service, @NonNull String peerId,
                              @NonNull String url, @NonNull String title,  boolean isIncognito) {
            ensurePeerStarted(service);
            thread.sendTabTo(peerId, url, title, isIncognito);
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    public final void startPeer() {
        PeerThreadReference.INSTANCE.startPeer(this);
    }

    @SuppressWarnings("unused")
    public final void stopPeer() {
        PeerThreadReference.INSTANCE.stopPeer();
    }

    public final void addPeer(final @NonNull String peerInfo) {
        PeerThreadReference.INSTANCE.sendPeerInfo(this, peerInfo);
    }

    public final void disconnectPeer(final @NonNull String peerId) {
        PeerThreadReference.INSTANCE.disconnectDevice(this, peerId);
    }

    public final void renamePeer(final @NonNull String peerId, final @NonNull String newName) {
        PeerThreadReference.INSTANCE.renameDevice(this, peerId, newName);
    }

    public void requestPairingData() {
        PeerThreadReference.INSTANCE.requestPairingData(this);
    }

    public void sendTabTo(@NonNull String id, @NonNull String url, @NonNull String title,
                          boolean isIncognito) {
        PeerThreadReference.INSTANCE.sendTabTo(this, id, url, title, isIncognito);
    }

    public static void startPeerCommunication(Context context) {
        final PeerCommunicationStarter starter =
                new PeerCommunicationStarter(context);
        starter.start();
    }

    public static @Nullable PeerCommunicationService getFromBinder(IBinder iBinder) {
        if (PeerCommunicationServiceBinder.class.isInstance(iBinder)) {
            return PeerCommunicationServiceBinder.class.cast(iBinder).getService();
        }
        return null;
    }
}
