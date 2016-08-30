package com.cliqz.browser.app;

import android.support.annotation.Nullable;

import com.cliqz.browser.di.components.ActivityComponent;

/**
 * Must be implementend by types able to return an {@link ActivityComponent}.
 *
 * @author Stefano Pacifici
 * @date 2016/08/08
 */
public interface ActivityComponentProvider {
    /**
     * Get an {@link ActivityComponent}
     *
     * @return an ActivityComponent instance or null
     */
    @Nullable  ActivityComponent getActivityComponent();
}
