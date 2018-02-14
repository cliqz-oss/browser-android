package com.cliqz.browser.utils;

/**
 * Clone of the android.utils.MutableInt which is not available before Android 5.0
 *
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public class MutableInt {
    int value;

    /**
     * Initialize the instance with an initial value
     *
     * @param value the initial value
     */
    public MutableInt(int value) {
        this.value = value;
    }
}
