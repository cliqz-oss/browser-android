package com.cliqz.browser.main;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.controlcenter.ControlCenterDialog;
import com.cliqz.browser.main.search.Freshtab;

import dagger.Subcomponent;

/**
 * @author Ravjit Uppal
 */
@PerActivity
@Subcomponent(modules = {MainActivityModule.class})
public interface FlavoredActivityComponent extends MainActivityComponent {

    void inject(Freshtab freshtab);

    void inject(QuickAccessBar quickAccessBar);

    void inject(ControlCenterDialog controlCenterDialog);
}
