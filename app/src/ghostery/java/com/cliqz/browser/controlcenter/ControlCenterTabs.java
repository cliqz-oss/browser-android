package com.cliqz.browser.controlcenter;

import android.support.annotation.NonNull;
import android.support.annotation.StringRes;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
enum ControlCenterTabs {

    FIRST(R.string.control_center_header_overview, TrackersOverviewFragment.class),
    SECOND(R.string.control_center_header_trackers, TrackersListFragment.class);

    @StringRes
    final int title;

    final Class<? extends ControlCenterFragment> fragmentClass;

    ControlCenterTabs(@StringRes int title, @NonNull Class<? extends ControlCenterFragment> clazz) {
        this.title = title;
        this.fragmentClass = clazz;
    }
}
