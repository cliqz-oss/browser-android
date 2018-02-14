package com.cliqz.browser.app;

import android.content.Context;

import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.SubscriptionsManager;

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

    @Singleton
    @Provides
    public HistoryDatabase provideHistoryDatabase() {
        return new HistoryDatabase(context);
    }
    
    @Singleton
    @Provides
    public Telemetry provideTelemetry(PreferenceManager preferenceManager,
                                      HistoryDatabase historyDatabase, Timings timings) {
        return new Telemetry(context, preferenceManager, historyDatabase, timings);
    }

    @Singleton
    @Provides
    public SubscriptionsManager provideSubscriptionManager() {
        return new SubscriptionsManager(context);
    }
}
