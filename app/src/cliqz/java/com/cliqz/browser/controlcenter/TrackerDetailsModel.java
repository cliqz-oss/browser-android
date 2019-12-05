package com.cliqz.browser.controlcenter;

import androidx.annotation.NonNull;

/**
 * Created by Ravjit on 09/08/16.
 */
@SuppressWarnings("WeakerAccess")
public class TrackerDetailsModel {
    public final String companyName;
    public final int trackerCount;
    public final String wtm;

    public TrackerDetailsModel(@NonNull String companyName,
                               int trackerCount,
                               @NonNull String wtm) {
        this.companyName = companyName;
        this.trackerCount = trackerCount;
        this.wtm = wtm;
    }

}
