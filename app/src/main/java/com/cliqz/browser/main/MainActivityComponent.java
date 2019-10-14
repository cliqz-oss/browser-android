package com.cliqz.browser.main;

import com.cliqz.browser.controlcenter.ControlCenterHelper;
import com.cliqz.browser.main.search.Incognito;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.overview.CommonOverviewFragment;
import com.cliqz.browser.overview.TabsOverviewFragment;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.widget.OverFlowMenu;
import com.cliqz.deckview.TabsDeckView;
import com.cliqz.nove.Bus;

import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.view.LightningChromeClient;
import acr.browser.lightning.view.LightningView;

interface MainActivityComponent {
    void inject(MainActivity mainActivity);

    void inject(LightningView lightningView);

    void inject(TabFragment2 tabFragment);

    void inject(FragmentWithBus fragmentWithBus);

    void inject(OverFlowMenu overFlowMenu);

    Bus getBus();

    void inject(CommonOverviewFragment overviewFragment);

    void inject(TabsOverviewFragment tabsOverviewFragment);

    void inject(OnBoardingHelper onBoardingHelper);

    void inject(SearchView searchView);

    void inject(TabsDeckView tabsDeckView);

    void inject(PasswordManager passwordManager);

    void inject(Incognito incognito);

    void inject(ControlCenterHelper controlCenterHelper);

    void inject(LightningDownloadListener lightningDownloadListener);

    void inject(LightningChromeClient lightningChromeClient);
}
