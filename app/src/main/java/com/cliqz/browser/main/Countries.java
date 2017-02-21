package com.cliqz.browser.main;

import com.cliqz.browser.R;

/**
 * Created by Ravjit on 31/01/17.
 */

public enum Countries {
    germany("de", R.string.germany),
    france("fr", R.string.france),
    usa("us", R.string.usa);

    public final String countryCode;
    public final int countryNameResourceId;

    public static Countries safeValueOf(String value) {
        try {
            return Countries.valueOf(value);
        } catch (IllegalArgumentException e) {
            return germany;
        }
    }

    Countries(String countryCode, int countryNameResourceId) {
        this.countryCode = countryCode;
        this.countryNameResourceId = countryNameResourceId;
    }
}
