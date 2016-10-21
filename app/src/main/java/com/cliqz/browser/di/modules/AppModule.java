package com.cliqz.browser.di.modules;

import android.content.Context;

import com.cliqz.antitracking.AntiTracking;
import com.cliqz.antitracking.AntiTrackingSupport;
import com.cliqz.browser.antiphishing.AntiPhishing;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.utils.Telemetry;
import com.google.gson.Gson;
import com.squareup.otto.Bus;

import org.json.JSONObject;

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

    // Removed as version 1.0.2r2, the ProxyUtils class was removed after version 9bf1786
    // @Provides
    // public I2PAndroidHelper providesI2PAndroidHelper() {
    //     return new I2PAndroidHelper(app.getApplicationContext());
    // }

    // @Provides
    // @Singleton
    // public ProxyUtils providesProxyUtils(PreferenceManager manager, I2PAndroidHelper helper) {
    //     return new ProxyUtils(manager, helper);
    // }

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
    public AntiTracking provideAntiTracking(Context context, final Telemetry telemetry) {
        return new AntiTracking(context, new AntiTrackingSupport() {
            @Override
            public void sendSignal(JSONObject obj) {
                telemetry.saveExtSignal(obj);
            }

            @Override
            public boolean isAntiTrackTestEnabled() {
                return true;
            }

            @Override
            public boolean isForceBlockEnabled() {
                return false;
            }

            @Override
            public boolean isBloomFilterEnabled() {
                return true;
            }

            @Override
            public String getDefaultAction() {
                return "placeholder";
            }
        });
    }

}
