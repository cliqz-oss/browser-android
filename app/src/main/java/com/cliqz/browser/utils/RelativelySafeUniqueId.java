package com.cliqz.browser.utils;

import java.util.Locale;
import java.util.concurrent.atomic.AtomicLong;

/**
 * As the name says, this a not criptographic unique id, but it is safe for our purposes
 *
 * @author Stefano Pacifici
 */
public final class RelativelySafeUniqueId {
    private static final AtomicLong counter = new AtomicLong(System.currentTimeMillis() * 1000L);

    public static String createNewUniqueId() {
        return String.format(Locale.US, "%d", counter.getAndIncrement());
    }
}
