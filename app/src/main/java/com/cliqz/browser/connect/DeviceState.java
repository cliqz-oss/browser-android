package com.cliqz.browser.connect;

/**
 * List of the states a device can be in
 *
 * @author Stefano Pacifici
 */
enum DeviceState {
    CONNECTED,
    PAIRING,
    DISCONNECTED;

    public static DeviceState safeValueOf(String status) {
        final String st = status != null ? status.toUpperCase() : "offline";
        try {
            return DeviceState.valueOf(st);
        } catch (IllegalArgumentException e) {
            return DeviceState.DISCONNECTED;
        }
    }
}
