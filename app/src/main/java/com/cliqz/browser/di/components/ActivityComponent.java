package com.cliqz.browser.di.components;

import com.cliqz.browser.di.annotations.PerActivity;
import com.cliqz.browser.di.modules.MainActivityModule;
import com.cliqz.browser.main.FragmentWithBus;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.main.TabFragment;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.overview.TabOverviewFragment;
import com.cliqz.browser.webview.BaseWebView;
import com.cliqz.browser.webview.Bridge;
import com.cliqz.browser.widget.OverFlowMenu;
import com.squareup.otto.Bus;

import acr.browser.lightning.utils.ProxyUtils;
import acr.browser.lightning.view.CliqzWebView;
import acr.browser.lightning.view.LightningView;
import dagger.Subcomponent;

/**
 * Created by Ravjit on 30/12/15.
 */
@PerActivity
@Subcomponent(modules = {MainActivityModule.class})
public interface ActivityComponent {

    void inject(MainActivity mainActivity);

    void inject(LightningView lightningView);

    void inject(TabFragment tabFragment);

    void inject(FragmentWithBus fragmentWithBus);

    void inject(Bridge bridge);

    void inject(BaseWebView searchWebView);

    void inject(OverFlowMenu overFlowMenu);

    Bus getBus();

    void inject(ProxyUtils proxyUtils);

    void inject(CliqzWebView cliqzWebView);

    void inject(OverviewFragment overviewFragment);

    void inject(TabOverviewFragment tabOverviewFragment);

    void inject(OnBoardingHelper onBoardingHelper);
}
