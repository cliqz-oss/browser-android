package com.cliqz.browser.app;

import android.content.Context;

import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.gcm.AwsSNSManager;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.browser.peercomm.ChunkedFileManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.Timings;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;
import com.google.gson.Gson;

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

    private final BrowserApp app;

    public AppModule(BrowserApp app) {
        this.app = app;
    }

    @Provides
    Context provideContext() {
        return app.getApplicationContext();
    }

    @Provides
    @Singleton
    Telemetry providesTelemetry(PreferenceManager preferenceManager,
                     HistoryDatabase historyDatabase, Timings timings) {
        return new Telemetry(app.getApplicationContext(), preferenceManager, historyDatabase, timings);
    }

    @Provides
    @Singleton
    PasswordManager providePasswordManager() {
        return new PasswordManager();
    }

    @Provides
    @Singleton
    PreferenceManager providePreferenceManager() {
        return new PreferenceManager(app);
    }

    @Provides
    Gson providesGson() {
        return new Gson();
    }

    @Provides
    @Singleton
    HistoryDatabase providesHistoryDatabase(Context context) {
        return new HistoryDatabase(context);
    }

    @Provides
    @Singleton
    PasswordDatabase providesPasswordDatabase(Context context) {
        return new PasswordDatabase(context);
    }

    @Provides
    AwsSNSManager providesAwsSNSManager(PreferenceManager preferenceManager, Context context) {
        return new AwsSNSManager(preferenceManager, context);
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
    Engine provideJSEngine(Context context, Bus bus) {
          return new Engine(context, this.app, bus);
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
    public QueryManager provideQueryManager(HistoryDatabase historyDatabase) {
        return new QueryManager(historyDatabase);
    }
}
