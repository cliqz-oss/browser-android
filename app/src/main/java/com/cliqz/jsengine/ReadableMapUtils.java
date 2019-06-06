package com.cliqz.jsengine;

import com.facebook.react.bridge.ReadableMap;

/**
 * @author Ravjit Uppal
 */
public class ReadableMapUtils {

    public static int getSafeInt(ReadableMap map, String key) {
        return map.hasKey(key) ? map.getInt(key) : 0;
    }

    public static int getSafeInt(ReadableMap map, String key, int defaultValue) {
        return map.hasKey(key) ? map.getInt(key) : defaultValue;
    }

    public static String getSafeString(ReadableMap map, String key) {
        return map.hasKey(key) ? map.getString(key) : "";
    }

    public static String getSafeString(ReadableMap map, String key, String defaultValue) {
        return map.hasKey(key) ? map.getString(key) : defaultValue;
    }
}
