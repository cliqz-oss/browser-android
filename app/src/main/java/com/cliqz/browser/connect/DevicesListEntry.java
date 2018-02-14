package com.cliqz.browser.connect;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Represents a device in the connected devices list
 *
 * @author Stefano Pacifici
 */
public class DevicesListEntry {
    public final String name;
    public final String id;
    public final DeviceState state;

    public DevicesListEntry(JSONObject entry) throws JSONException {
        final String name = entry.optString("name", null);
        this.id = entry.getString("id");
        this.name = name != null ? name : this.id;
        this.state = DeviceState.safeValueOf(entry.getString("status"));
    }

    @SuppressWarnings("unused")
    DevicesListEntry(String name, String id, DeviceState state) {
        this.name = name;
        this.id = id;
        this.state = state;
    }
}
