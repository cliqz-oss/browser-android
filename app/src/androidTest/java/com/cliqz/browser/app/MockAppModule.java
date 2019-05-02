package com.cliqz.browser.app;

import android.content.Context;

import com.cliqz.browser.mock.MockBrowserApp;
import com.cliqz.browser.mock.MockPreferenceManager;

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

    public MockAppModule(MockBrowserApp app) {
        super(app);
        this.app = app;
    }

    @Provides
    @Singleton
    @Override
    public PreferenceManager providePreferenceManager() {
        return new MockPreferenceManager(app);
    }
}
