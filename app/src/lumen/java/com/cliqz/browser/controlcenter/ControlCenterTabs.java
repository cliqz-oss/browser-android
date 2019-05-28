package com.cliqz.browser.controlcenter;

import androidx.annotation.NonNull;
import androidx.annotation.StringRes;

/**
 * @author Stefano Pacifici
 */
enum ControlCenterTabs {

    ;

    @StringRes
    final int title;

    final Class<? extends ControlCenterFragment> fragmentClass;

    ControlCenterTabs(@StringRes int title, @NonNull Class<? extends ControlCenterFragment> clazz) {
        this.title = title;
        this.fragmentClass = clazz;
    }
}
