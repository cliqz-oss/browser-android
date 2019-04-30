package com.cliqz.browser.controlcenter;

import android.support.annotation.StringRes;

/**
 * Copyright © Cliqz 2019
 *
 * Model class for values in dashboard. It contains the value itself and a corresponding unit;
 */
class MeasurementWrapper {

    private final String mValue;
    private final @StringRes int mUnit;

    MeasurementWrapper(String value, @StringRes int unit) {
        mValue = value;
        mUnit = unit;
    }

    String getValue() {
        return mValue;
    }

    @StringRes int getUnit() {
        return mUnit;
    }
}
