package com.cliqz.browser.webview;

import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.Map;

/**
 * @author Stefano Pacifici
 */
class JavascriptCallbackRegistry {

    private static long REGULAR_DELTA = 5000L;
    private static long PRESSURE_DELTA = 50L;
    private static int MAX_SIZE = 100;

    private static class RegistryEntry {
        final int ref;
        final long timestamp;
        final JavascriptResultHandler handler;

        RegistryEntry(JavascriptResultHandler handler) {
            this.ref = handler.hashCode();
            this.handler = handler;
            this.timestamp = System.currentTimeMillis();
        }
    }

    private final LinkedList<RegistryEntry> registry = new LinkedList<>();

    void add(@NonNull JavascriptResultHandler handler) {
        if (registry.size() > MAX_SIZE) {
            remove(0, true);
        }
        registry.add(new RegistryEntry(handler));
    }

    @Nullable
    JavascriptResultHandler remove(int ref) {
        return remove(ref, false);
    }

    // if forceClean is true we are not looking up for a reference: we just want to clean up
    // the lookup table, the function doesn't search at all in that case
    private JavascriptResultHandler remove(int ref, boolean forceClean) {
        final long delta = registry.size() > 100 ? PRESSURE_DELTA: REGULAR_DELTA;
        final Iterator<RegistryEntry> iterator = registry.iterator();
        final long now = System.currentTimeMillis();
        while (iterator.hasNext()) {
            final RegistryEntry entry = iterator.next();
            if (!forceClean && entry.ref == ref) {
                iterator.remove();
                return entry.handler;
            } else if (now - entry.timestamp > delta) {
                iterator.remove();
            }
        }
        return null;
    }
}
