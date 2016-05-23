package com.cliqz.browser.utils;

/**
 * @author Stefano Pacifici
 * @date 2016/02/26
 */
public final class DebugUtils {
    private DebugUtils() {} // No instances

    public static String prettyPrintOnLayout(boolean changed, int l, int t, int r, int b) {
        return String.format("%s Left: %d, Top: %d, Right: %d, Bottom: %d",
                changed ? "Layout changed!" : "Layout didn't change",
                l, t, r, b);
    }
}
