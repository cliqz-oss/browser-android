package com.cliqz.browser.utils;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.UiThread;
import androidx.annotation.VisibleForTesting;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import acr.browser.lightning.utils.Utils;

/**
 * Manage subscriptions (duh!). This will store the subscriptions list every time the user adds
 * one of them.<br>
 * Subscriptions are stored in a text file, one per line:
 * <pre>
 *     &lt;type&gt;|&lt;sub-type&gt;|&lt;value&gt;
 * </pre>
 * In example:
 * <pre>
 *     soccer|game|123
 *     soccer|team|6789
 *     basketball|league|456
 * </pre>
 *
 * @author Stefano Pacifici
 */
public class SubscriptionsManager {

    private final static String TAG = SubscriptionsManager.class.getSimpleName();

    private final static String SUBSCRIPTIONS_FILE_NAME = "subscriptions.txt";

    private final CountDownLatch latch;
    private final ExecutorService executor;

    @SuppressWarnings("WeakerAccess")
    @VisibleForTesting final File subscriptionsFile;
    private final Map<String, Map<String, Set<String>>> subscriptions = new HashMap<>();

    public SubscriptionsManager(Context context) {
        latch = new CountDownLatch(1);
        subscriptionsFile = getSubscriptionsFile(context);
        executor = Executors.newSingleThreadExecutor();
        loadSubscriptions();
    }

    @VisibleForTesting
    static File getSubscriptionsFile(Context context) {
        return new File(context.getFilesDir(), SUBSCRIPTIONS_FILE_NAME);
    }

    /**
     * Add the subscription identified by type, sub-type and id. This cause a persist operation.
     * @param type the main type (i.e. soccer, tennis, weather)
     * @param subType the sub-type (i.e. team, game, city or country)
     * @param id a unique identifier for the type/sub-type, can be numbers or name (i.e. 123 or
     *           "FC Bayern München")
     */
    @UiThread
    public void addSubscription(String type, String subType, String id) {
        try {
            latch.await();
            final Map<String, Set<String>> typeMap = getType(type);
            final Set<String> values = getSet(typeMap, subType);
            values.add(id);
            saveSubscriptions();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    /**
     * Remove the subscription identified by type, sub-type and id. This cause a persist operation.
     * @see SubscriptionsManager#addSubscription(String, String, String)
     * @param type the main type
     * @param subType the sub-type
     * @param id a unique identifier for the type/sub-type
     */
    @UiThread
    public void removeSubscription(String type, String subType, String id) {
        try {
            latch.await();
            final Map<String, Set<String>> typeMap = getType(type);
            final Set<String> values = getSet(typeMap, subType);
            values.remove(id);
            saveSubscriptions();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    private void loadSubscriptions() {
        executor.execute(() -> {
            BufferedReader reader = null;
            try {
                reader = new BufferedReader(new FileReader(subscriptionsFile));
                String line;
                while ((line = reader.readLine()) != null) {
                    final String[] parts = line.split("\\|");
                    final String type = parts[0];
                    final String subtype = parts[1];
                    final String value = parts[2];
                    final Map<String, Set<String>> typeMap = getType(type);
                    final Set<String> valuesSet = getSet(typeMap, subtype);
                    valuesSet.add(value);
                }
            } catch (Exception e) {
                Log.i(TAG, "Can't load " + subscriptionsFile.getName());
            } finally {
                Utils.close(reader);
                latch.countDown();
            }
        });
    }

    private void saveSubscriptions() {
        executor.execute(() -> {
            final File tmpFile = new File(subscriptionsFile.getPath() + "_" +
                    System.currentTimeMillis());
            //noinspection ResultOfMethodCallIgnored
            tmpFile.delete();
            BufferedWriter writer = null;
            try {
                writer = new BufferedWriter(new FileWriter(tmpFile, false));
                for (final String type: subscriptions.keySet()) {
                    final Map<String, Set<String>> entry = subscriptions.get(type);
                    if (entry == null) {
                        continue;
                    }
                    for (final String key: entry.keySet()) {
                        final Set<String> values = entry.get(key);
                        if (values == null) {
                            continue;
                        }
                        for (final String value: values) {
                            writer
                                .append(type).append("|")
                                .append(key).append("|")
                                .append(value);
                            writer.newLine();
                        }
                    }
                }
                // Close the writer before renaming the file
                Utils.close(writer);
                synchronized (SubscriptionsManager.this) {
                    //noinspection ResultOfMethodCallIgnored
                    tmpFile.renameTo(subscriptionsFile);
                }
            } catch (Exception e) {
                e.printStackTrace();
            } finally {
                Utils.close(writer);
            }
        });
    }

    private Set<String> getSet(Map<String, Set<String>> typeMap, String subtype) {
        Set<String> values = typeMap.get(subtype);
        if (values == null) {
            values = new HashSet<>();
            typeMap.put(subtype, values);
        }
        return values;
    }

    private Map<String, Set<String>> getType(String type) {
        Map<String, Set<String>> entry = subscriptions.get(type);
        if (entry == null) {
            entry = new HashMap<>();
            subscriptions.put(type, entry);
        }
        return entry;
    }

    @NonNull
    WritableMap toWritableMap() {
        WritableMap result = Arguments.createMap();

        try {
            latch.await();
            for (final String typeName: subscriptions.keySet()) {
                final Map<String, Set<String>> subtypes = subscriptions.get(typeName);
                if (subtypes == null) {
                    continue;
                }
                final WritableMap map = Arguments.createMap();
                for (final String subtypeName: subtypes.keySet()) {
                    final Set<String> idsSet = subtypes.get(subtypeName);
                    if (idsSet == null) {
                        continue;
                    }
                    final WritableArray ids = Arguments.fromArray(idsSet.toArray(new String[0]));
                    map.putArray(subtypeName, ids);
                }
                result.putMap(typeName, map);
            }
        } catch (InterruptedException e) {
            Log.e(TAG, "Interrupted");
        }
        return result;
    }

    public boolean isSubscribed(String type, String subtype, String value) {
        final Map<String, Set<String>> subtypes = getType(type);
        final Set<String> values = getSet(subtypes, subtype);
        return values.contains(value);
    }

    /**
     * Reset all the inner data, after this the user has no subscription at all. This cause a
     * persist operation.
     */
    @UiThread
    public void resetSubscriptions() {
        try {
            latch.await();
            // We do not want to clear the data before loading stuff from the disk
            subscriptions.clear();
            saveSubscriptions();
        } catch (InterruptedException e) {
            Log.e(TAG, "Interrupted");
        }
    }
}
