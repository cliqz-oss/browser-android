package com.cliqz.browser.di.modules;

import android.content.Context;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.gcm.AwsSNSManager;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.Engine;
import com.google.gson.Gson;
import com.squareup.otto.Bus;

import java.util.LinkedHashMap;
import java.util.Map;

import javax.inject.Singleton;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.database.PasswordDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import dagger.Module;
import dagger.Provides;

/**
 * Created by Stefano Pacifici on 01/09/15.
 */
@Module
public class AppModule {
    private final BrowserApp app;

    public AppModule(BrowserApp app) {
        this.app = app;
    }

    @Provides
    public Context provideContext() {
        return app.getApplicationContext();
    }

    @Provides
    @Singleton
    Telemetry provideTelemetry() {
        return new Telemetry(app.getApplicationContext());
    }

    @Provides
    @Singleton
    PasswordManager providePasswordManager() {
        return new PasswordManager();
    }

    @Provides
    @Singleton
    public PreferenceManager providePreferenceManager() {
        return new PreferenceManager(app);
    }

    @Provides
    public Gson providesGson() {
        return new Gson();
    }

    @Provides
    @Singleton
    public HistoryDatabase providesHistoryDatabase(Context context) {
        return new HistoryDatabase(context);
    }

    @Provides
    @Singleton
    public PasswordDatabase providesPasswordDatabase(Context context) {
        return new PasswordDatabase(context);
    }

    @Provides
    public AwsSNSManager providesAwsSNSManager(PreferenceManager preferenceManager, Context context) {
        return new AwsSNSManager(preferenceManager, context);
    }

    @Provides
    @Singleton
    Bus provideBus() {
        return new Bus();
    }

    @Provides
    @Singleton
    public AntiPhishing provideAntiPhishing() {
        return new AntiPhishing();
    }

    @Provides
    @Singleton
    public Engine provideJSEngine(Context context, final PreferenceManager prefs) {
        try {
            final Engine engine = new Engine(context, false);
            final Map<String, Object> defaultPrefs = new LinkedHashMap<>();
            defaultPrefs.putAll(AntiTracking.getDefaultPrefs());
            defaultPrefs.putAll(Adblocker.getDefaultPrefs(prefs.getAdBlockEnabled()));
            if (BuildConfig.DEBUG) {
                defaultPrefs.putAll(Engine.getDebugPrefs());
            }
            engine.startup(defaultPrefs);
            // force set force block pref to upgrade old profiles
            engine.setPref("attrackForceBlock", true);
            return engine;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Provides
    @Singleton
    public AntiTracking provideAntiTracking(Engine engine) {
        return new AntiTracking(engine);
    }

    @Provides
    @Singleton
    public Adblocker provideAdblocker(Engine engine) {
        return new Adblocker(engine);
    }

}
