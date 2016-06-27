package com.cliqz.browser.di.modules;

import android.content.Context;

import com.cliqz.browser.app.BrowserApp;

// import com.cliqz.browser.gcm.AwsSNSManager;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.Telemetry;
import com.google.gson.Gson;

import net.i2p.android.ui.I2PAndroidHelper;

import javax.inject.Singleton;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.database.PasswordDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.AdBlock;
import acr.browser.lightning.utils.ProxyUtils;
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
    @Singleton
    public AdBlock provideAdBlock() {
        return new AdBlock(app.getApplicationContext());
    }

    @Provides
    public I2PAndroidHelper providesI2PAndroidHelper() {
        return new I2PAndroidHelper(app.getApplicationContext());
    }

    @Provides
    @Singleton
    public ProxyUtils providesProxyUtils(PreferenceManager manager, I2PAndroidHelper helper) {
        return new ProxyUtils(manager, helper);
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

/*  F-DROID Version
    @Provides
    public AwsSNSManager providesAwsSNSManager(PreferenceManager preferenceManager, Context context) {
        return new AwsSNSManager(preferenceManager, context);
    }
*/

}
