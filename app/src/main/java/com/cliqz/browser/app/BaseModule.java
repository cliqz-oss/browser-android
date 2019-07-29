package com.cliqz.browser.app;

import android.content.Context;

import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.nove.Bus;

import javax.inject.Singleton;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import dagger.Module;
import dagger.Provides;

/**
 * @author Stefano Pacifici
 */
@Module
public class BaseModule {

    private final Context context;

    public BaseModule(Context context) {
        this.context = context;
    }

    @Singleton
    @Provides
    public PreferenceManager providePreferenceManager() {
        return new PreferenceManager(context);
    }

    @Provides
    @Singleton
    Bus provideBus() {
        return new Bus();
    }

    @Provides
    @Singleton
    PurchasesManager providePurchasesManager(Context context, Bus bus, PreferenceManager prefs) {
        return new PurchasesManager(context, bus, prefs);
    }

    @Provides
    Context provideContext() {
        return context;
    }

    @Singleton
    @Provides
    public HistoryDatabase provideHistoryDatabase() {
        return new HistoryDatabase(context);
    }
    
    @Singleton
    @Provides
    public Telemetry provideTelemetry(PreferenceManager preferenceManager, PurchasesManager purchasesManager,
                                      HistoryDatabase historyDatabase, Timings timings) {
        return new Telemetry(context, preferenceManager, purchasesManager, historyDatabase, timings);
    }

    @Singleton
    @Provides
    public SubscriptionsManager provideSubscriptionManager() {
        return new SubscriptionsManager(context);
    }
}
