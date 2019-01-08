package com.cliqz.browser.controlcenter;

import dagger.Subcomponent;

/**
 * Specific component for Ghostery
 *
 * @author Stefano Pacifici
 */
@Subcomponent(modules = { ControlCenterModule.class})
public interface ControlCenterComponent {
    void inject(TrackersListFragment trackersListFragment);

    void inject(TrackersOverviewFragment trackersOverviewFragment);
}
