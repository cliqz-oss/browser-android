package com.cliqz.browser.test;

import android.os.Handler;
import android.os.Looper;

import java.util.concurrent.Semaphore;

/**
 * Created by Ravjit on 22/01/16.
 */
public class AssertionHelper {
    private Throwable throwable = null;
    private final Runnable test;
    private final Handler handler;

    public AssertionHelper(Runnable test) {
        this.handler = new android.os.Handler(Looper.getMainLooper());
        this.test = test;
    }

    public void apply() throws Throwable {
        final Semaphore semaphore = new Semaphore(0);
        handler.post(new Runnable() {
            @Override
            public void run() {
                try {
                    test.run();
                } catch (Throwable t) {
                    throwable = t;
                } finally {
                    semaphore.release();
                }
            }
        });
        semaphore.acquire();
        if (throwable != null) {
            throw throwable;
        }
    }
}
