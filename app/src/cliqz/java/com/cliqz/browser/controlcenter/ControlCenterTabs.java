package com.cliqz.browser.controlcenter;

import android.support.annotation.NonNull;
import android.support.annotation.StringRes;
import android.support.v4.app.Fragment;

import com.cliqz.browser.R;

/**
 * @author Stefano Pacifici
 */
enum ControlCenterTabs {

    FIRST(R.string.control_center_header_antitracking, AntiTrackingFragment.class),
    SECOND(R.string.control_center_header_adblocking, AdBlockingFragment.class),
    THIRD(R.string.control_center_header_antiphishing, AntiPhishingFragment.class);

    @StringRes
    final int title;

    final Class<? extends ControlCenterFragment> fragmentClass;

    ControlCenterTabs(@StringRes int title, @NonNull Class<? extends ControlCenterFragment> clazz) {
        this.title = title;
        this.fragmentClass = clazz;
    }
}
