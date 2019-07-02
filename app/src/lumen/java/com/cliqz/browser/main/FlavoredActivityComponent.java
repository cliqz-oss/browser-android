package com.cliqz.browser.main;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.controlcenter.ControlCenterDialog;
import com.cliqz.browser.controlcenter.ControlCenterHelper;
import com.cliqz.browser.controlcenter.DashboardFragment;
import com.cliqz.browser.purchases.PurchaseFragment;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.starttab.FavoritesView;
import com.cliqz.browser.starttab.HistoryView;
import com.cliqz.browser.starttab.freshtab.FreshTab;
import com.cliqz.browser.vpn.VpnHandler;
import com.cliqz.browser.vpn.VpnPanel;

import dagger.Subcomponent;

/**
 * @author Ravjit Uppal
 */
@PerActivity
@Subcomponent(modules = {MainActivityModule.class})
public interface FlavoredActivityComponent extends MainActivityComponent {

    void inject(VpnPanel vpnPanel);

    void inject(DashboardFragment dashboardFragment);

    void inject(FreshTab freshTab);

    void inject(HistoryView historyView);

    void inject(FavoritesView favoritesView);

    void inject(PurchaseFragment purchaseFragment);

    void inject(PurchasesManager purchasesManager);

    void inject(VpnHandler vpnHandler);

    void inject(ControlCenterDialog controlCenterDialog);
}
