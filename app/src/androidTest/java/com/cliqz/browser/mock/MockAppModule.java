package com.cliqz.browser.mock;

import android.content.Context;

import com.cliqz.browser.di.modules.AppModule;

import javax.inject.Singleton;

import acr.browser.lightning.preference.PreferenceManager;
import dagger.Module;
import dagger.Provides;

/**
 * Created by Ravjit on 19/01/16.
 */
@Module
public class MockAppModule extends AppModule {

    private final MockBrowserApp app;

    public Context provideContext() {
        return app.getApplicationContext();}

    protected MockAppModule(MockBrowserApp app) {
        super(app);
        this.app = app;
    }

    @Provides
    @Singleton
    @Override
    public PreferenceManager providePreferenceManager() {
        final MockPreferenceManager mockedPreferenceManager = new MockPreferenceManager(app);
        return mockedPreferenceManager;
    }

}
