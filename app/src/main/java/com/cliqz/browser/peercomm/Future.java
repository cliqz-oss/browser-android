package com.cliqz.browser.peercomm;

import androidx.annotation.Nullable;

import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

/**
 * @author Stefano Pacifici
 */

class Future<T> {

    private T mValue;
    private final Semaphore semaphore = new Semaphore(-1);

    protected void set(T value) {
        mValue = value;
        semaphore.release();
    }

    public @Nullable T get(long timeout, TimeUnit unit) {
        if (mValue != null) {
            return mValue;
        }

        try {
            final boolean acquired = semaphore.tryAcquire(timeout, unit);
            if (acquired) {
                // release it immediately, we do not really need it
                semaphore.release();
            }
            return acquired ? mValue : null;
        } catch (InterruptedException e) {
            return null;
        }
    }
}
