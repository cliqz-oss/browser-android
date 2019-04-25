package com.cliqz.browser.main;

import android.app.Activity;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.utils.AppBackgroundManager;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.jsengine.Engine;

import org.mozilla.geckoview.GeckoRuntime;

import javax.inject.Singleton;

import acr.browser.lightning.preference.PreferenceManager;
import dagger.Module;
import dagger.Provides;

/**
 * @author Ravjit Uppal
 */
@Module
public class MainActivityModule {

    private final MainActivity activity;

    public MainActivityModule(MainActivity activity) {
        this.activity = activity;
    }

    @Provides
    Activity providesActivity() {
        return activity;
    }

    @PerActivity
    @Provides
    TabsManager providesTabsManager() {
        return new TabsManager(activity.getSupportFragmentManager());
    }

    @PerActivity
    @Provides
    OnBoardingHelper providesOnBoardingHelper() {
        return new OnBoardingHelper(activity);
    }

    @PerActivity
    @Provides
    BloomFilterUtils providesBloomFilterUtils() {
        return new BloomFilterUtils();
    }

    @PerActivity
    @Provides
    SearchView providesSearchView(Activity activity, Engine engine) {
        return new SearchView(activity, engine);
    }

    @PerActivity
    @Provides
    CrashDetector provideCrashDetector(PreferenceManager preferenceManager) {
        return new CrashDetector(preferenceManager);
    }

    @PerActivity
    @Provides
    MainActivityHandler providesMainActivityHandler() {
        return new MainActivityHandler(activity);
    }

    @PerActivity
    @Provides
    PasswordManager providePasswordManager() {
        return new PasswordManager(activity);
    }

    @PerActivity
    @Provides
    AppBackgroundManager provideBackgroundManager() {
        return new AppBackgroundManager(activity);
    }
}
