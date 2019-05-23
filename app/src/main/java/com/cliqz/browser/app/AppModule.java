package com.cliqz.browser.app;

import android.content.Context;
import android.support.annotation.NonNull;

import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.gcm.AwsSNSManager;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.browser.peercomm.ChunkedFileManager;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import javax.inject.Singleton;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.database.PasswordDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import dagger.Module;
import dagger.Provides;

/**
 * @author Stefano Pacifici
 */
@Module
public class AppModule {

    private final BaseBrowserApp app;

    public AppModule(@NonNull BaseBrowserApp app) {
        this.app = app;
    }

    @Provides
    Context provideContext() {
        return app;
    }

    @Provides
    @Singleton
    Telemetry providesTelemetry(PreferenceManager preferenceManager,
                     HistoryDatabase historyDatabase, Timings timings) {
        return new Telemetry(app, preferenceManager, historyDatabase, timings);
    }

    @Provides
    @Singleton
    PreferenceManager providePreferenceManager() {
        return new PreferenceManager(app);
    }

    @Provides
    @Singleton
    HistoryDatabase providesHistoryDatabase() {
        return new HistoryDatabase(app);
    }

    @Provides
    @Singleton
    PasswordDatabase providesPasswordDatabase() {
        return new PasswordDatabase(app);
    }

    @Provides
    AwsSNSManager providesAwsSNSManager(PreferenceManager preferenceManager) {
        return new AwsSNSManager(preferenceManager, app);
    }

    @Provides
    @Singleton
    Bus provideBus() {
        return new Bus(/*AppModule.class.getSimpleName()*/);
    }

    @Provides
    @Singleton
    AntiPhishing provideAntiPhishing() {
        return new AntiPhishing();
    }

    @Provides
    @Singleton
    Engine provideJSEngine(Bus bus) {
          return new Engine(app, bus);
    }

    @Provides
    @Singleton
    AntiTracking provideAntiTracking(Engine engine) {
        return new AntiTracking(engine);
    }

    @Provides
    @Singleton
    Adblocker provideAdblocker(Engine engine, final PreferenceManager prefs) {
        return new Adblocker(engine, prefs.getAdBlockEnabled());
    }

    @Provides
    ChunkedFileManager providesChunkedFileManaget(Context context) {
        return new ChunkedFileManager(context);
    }

    @Provides
    @Singleton
    WebViewPersister provideWebViewPersister(Context context) {
        return new WebViewPersister(context);
    }

    @Provides
    @Singleton
    SubscriptionsManager provideSubscriptionsManager(Context context) {
        return new SubscriptionsManager(context);
    }

    @Provides
    @Singleton
    PurchasesManager providePurchasesManager(Context context, Bus bus) {
        return new PurchasesManager(context, bus);
    }

    @Provides
    @Singleton
    QueryManager provideQueryManager(HistoryDatabase historyDatabase) {
        return new QueryManager(historyDatabase);
    }
}
