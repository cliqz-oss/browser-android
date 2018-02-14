package com.cliqz.browser.peercomm;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.IBinder;
import android.util.Log;

/**
 * @author Stefano Pacifici
 */
class PeerCommunicationStarter extends Thread implements ServiceConnection {

    private static final String TAG = PeerCommunicationStarter.class.getSimpleName();

    private static final long TIMEOUT = 5000; // millis
    private final Context context;

    PeerCommunicationStarter(Context context) {
        this.context = context.getApplicationContext();
    }

    @Override
    public void run() {
        super.run();
        final Intent intent = new Intent(context, PeerCommunicationService.class);
        context.bindService(intent, this, Context.BIND_AUTO_CREATE);
        if (waitBindingOrUnbinding()) {
            context.unbindService(this);
            waitBindingOrUnbinding();
        }
    }

    private synchronized boolean waitBindingOrUnbinding() {
        final long startTime = System.currentTimeMillis();
        try {
            wait(TIMEOUT);
            final long now = System.currentTimeMillis();
            return (now - startTime < TIMEOUT);
        } catch (InterruptedException e) {
            Log.e(TAG, "Timeout binding the PeerCommunicationService");
            return false;
        }
    }

    @Override
    public void onServiceConnected(ComponentName name, IBinder service) {
        // Start the service itself
        final PeerCommunicationService peerCommunicationService =
                PeerCommunicationService.getFromBinder(service);
        if (peerCommunicationService != null) {
            peerCommunicationService.startPeer();
        }
        synchronized (this) {
            notify();
        }
    }

    @Override
    public void onServiceDisconnected(ComponentName name) {
        synchronized (this) {
            notify();
        }
    }
}
