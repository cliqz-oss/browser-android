package com.cliqz.browser.di.modules;

import android.app.Activity;

import com.cliqz.browser.di.annotations.PerActivity;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.OnBoardingHelper;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.webview.CliqzBridge;

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
    CliqzBridge provideCliqzBridge() {
        return new CliqzBridge(activity);
    }

    @Provides
    public Activity providesActivity() {
        return activity;
    }

    @PerActivity
    @Provides
    public TabsManager providesTabsManager() {
        return new TabsManager(activity, activity.getSupportFragmentManager());
    }

    @PerActivity
    @Provides
    public OnBoardingHelper providesOnBoardingHelper() {
        return new OnBoardingHelper(activity);
    }

    @PerActivity
    @Provides
    public BloomFilterUtils providesBloomFilterUtils() {
        return new BloomFilterUtils();
    }
}
