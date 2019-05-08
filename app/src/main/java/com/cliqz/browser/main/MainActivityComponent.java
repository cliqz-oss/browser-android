package com.cliqz.browser.main;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.controlcenter.AdBlockingFragment;
import com.cliqz.browser.controlcenter.AntiPhishingFragment;
import com.cliqz.browser.controlcenter.AntiTrackingFragment;
import com.cliqz.browser.controlcenter.ControlCenterDialog;
import com.cliqz.browser.main.search.Freshtab;
import com.cliqz.browser.main.search.Incognito;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.overview.TabOverviewFragment;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.webview.BaseWebView;
import com.cliqz.browser.webview.CliqzBridge;
import com.cliqz.browser.widget.OverFlowMenu;
import com.cliqz.deckview.TabsDeckView;
import com.cliqz.nove.Bus;

import acr.browser.lightning.view.CliqzWebView;
import acr.browser.lightning.view.LightningView;
import dagger.Subcomponent;

/**
 * @author Ravjit Uppal
 */
@PerActivity
@Subcomponent(modules = {MainActivityModule.class})
public interface MainActivityComponent {

    void inject(MainActivity mainActivity);

    void inject(LightningView lightningView);

    void inject(TabFragment tabFragment);

    void inject(FragmentWithBus fragmentWithBus);

    void inject(CliqzBridge bridge);

    void inject(OverFlowMenu overFlowMenu);

    Bus getBus();

    void inject(CliqzWebView cliqzWebView);

    void inject(OverviewFragment overviewFragment);

    void inject(TabOverviewFragment tabOverviewFragment);

    void inject(OnBoardingHelper onBoardingHelper);

    void inject(BaseWebView webView);

    void inject(AntiTrackingFragment antiTrackingFragment);

    void inject(AdBlockingFragment adBlockingFragment);

    void inject(AntiPhishingFragment antiPhishingFragment);

    void inject(ControlCenterDialog controlCenterDialog);

    void inject(SearchView searchView);

    void inject(Freshtab freshtab);

    void inject(TabsDeckView tabsDeckView);

    void inject(QuickAccessBar quickAccessBar);

    void inject(PasswordManager passwordManager);

    void inject(Incognito incognito);
}
