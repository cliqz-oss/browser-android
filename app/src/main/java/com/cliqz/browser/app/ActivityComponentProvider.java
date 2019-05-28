package com.cliqz.browser.app;

import androidx.annotation.Nullable;

import com.cliqz.browser.main.MainActivityComponent;

/**
 * Must be implementend by types able to return an {@link MainActivityComponent}.
 *
 * @author Stefano Pacifici
 * @date 2016/08/08
 */
public interface ActivityComponentProvider {
    /**
     * Get an {@link MainActivityComponent}
     *
     * @return an ActivityComponent instance or null
     */
    @Nullable
    MainActivityComponent getActivityComponent();
}
