package com.cliqz.browser.app;

import android.support.annotation.Nullable;

import com.cliqz.browser.main.FlavoredActivityComponent;

/**
 * Must be implementend by types able to return an {@link FlavoredActivityComponent}.
 *
 * @author Stefano Pacifici
 * @date 2016/08/08
 */
public interface ActivityComponentProvider {
    /**
     * Get an {@link FlavoredActivityComponent}
     *
     * @return an ActivityComponent instance or null
     */
    @Nullable
    FlavoredActivityComponent getActivityComponent();
}
