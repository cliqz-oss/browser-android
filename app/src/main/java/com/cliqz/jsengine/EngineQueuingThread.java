package com.cliqz.jsengine;

import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.util.Log;

import com.cliqz.browser.BuildConfig;

import java.util.concurrent.CountDownLatch;

/**
 * @author Stefano Pacifici
 */
class EngineQueuingThread extends Thread implements Handler.Callback {

    private static final String TAG = EngineQueuingThread.class.getSimpleName();

    private static class ExtensionInfiniteLoop extends Exception {
        ExtensionInfiniteLoop(String msg) {
            super(msg);
        }
    }

    private static final int LIMIT = 200;
    private final Engine engine;
    private Handler mHandler = null;
    private final CountDownLatch latch;

    EngineQueuingThread(Engine engine) {
        this.engine = engine;
        this.latch = new CountDownLatch(1);
    }

    @Override
    public void run() {
        Looper.prepare();
        mHandler = new Handler(this);
        latch.countDown();
        try {
            waitForBridge();
            Looper.loop();
        } catch (InterruptedException ie) {
            throw new RuntimeException("EngineQueuingThread failed", ie);
        } catch (ExtensionInfiniteLoop eil) {
            Log.e(TAG, "Extension was never ready");
        }
    }

    private synchronized void waitForBridge() throws InterruptedException, ExtensionInfiniteLoop {
        int counter;
        for (counter = 0; counter < LIMIT; counter ++) {
            try {
                engine.getBridge();
                break;
            } catch (EngineNotYetAvailable engineNotYetAvailable) {
                wait(300);
            }
        }
        if (counter >= LIMIT && !BuildConfig.DEBUG) {
            throw new ExtensionInfiniteLoop("Extension never got ready");
        }
    }

    Handler getHandler() {
        try {
            latch.await();
            return mHandler;
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }

    }
    @Override
    public boolean handleMessage(Message msg) {
        return false;
    }
}
