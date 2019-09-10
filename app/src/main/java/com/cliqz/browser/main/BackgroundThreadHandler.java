package com.cliqz.browser.main;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.CountDownLatch;

/**
 * An Handler backed up by a background thread.
 */
public class BackgroundThreadHandler extends Handler {

    public BackgroundThreadHandler() {
        super(BackgroundThread.createLooper());
    }

    private static class BackgroundThread extends Thread {

        private final CountDownLatch initCountDownLatch = new CountDownLatch(1);
        private Looper mLooper = null;

        static Looper createLooper() {
            final BackgroundThread backgroundThread = new BackgroundThread();
            backgroundThread.start();

            try {
                backgroundThread.initCountDownLatch.await();
            } catch (InterruptedException e) {
                throw new IllegalStateException(e);
            }
            if (backgroundThread.mLooper == null) {
                throw new IllegalStateException("The Looper was not initialized");
            }

            return backgroundThread.mLooper;
        }

        @Override
        public void run() {
            Looper.prepare();
            mLooper = Looper.myLooper();
            initCountDownLatch.countDown();
            Looper.loop();
        }
    }
}
