package com.cliqz.browser.di.modules;

import android.app.Activity;

import com.cliqz.browser.di.annotations.PerActivity;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.webview.CliqzBridge;
import com.squareup.otto.Bus;

import dagger.Module;
import dagger.Provides;

/**
 * Created by Ravjit on 30/12/15.
 */
@Module
public class MainActivityModule {

    private final MainActivity activity;

    public MainActivityModule(MainActivity activity) {
        this.activity = activity;
    }

    @Provides
    @PerActivity
    Bus provideBus() {
        return new Bus();
    }

    @Provides
    CliqzBridge provideCliqzBridge() {
        return new CliqzBridge(activity);
    }

    @Provides
    public Activity providesActivity() {
        return activity;
    }

    @Provides
    CliqzBrowserState providesCliqzBrowserState() {
        return activity.getBrowserState();
    }
}
