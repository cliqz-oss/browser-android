package com.cliqz.browser.controlcenter;

import dagger.Subcomponent;

/**
 * Specific component for CLIQZ
 *
 * @author Stefano Pacifici
 */
@Subcomponent(modules = { ControlCenterModule.class} )
public interface ControlCenterComponent {

    void inject(AdBlockingFragment adBlockingFragment);

    void inject(AntiPhishingFragment antiPhishingFragment);

    void inject(AntiTrackingFragment antiTrackingFragment);
}
