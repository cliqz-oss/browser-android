package com.cliqz.browser.main;

import android.app.Activity;

import androidx.annotation.Nullable;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.utils.AppBackgroundManager;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.utils.PasswordManager;
import com.cliqz.browser.vpn.VpnHandler;
import com.cliqz.jsengine.Engine;

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
    SearchView providesSearchView() {
        final SearchView searchView = activity.getSearchView();
        assert searchView != null;
        return searchView;
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

    @PerActivity
    @Provides
    VpnHandler provideVpnHandler() {
        return new VpnHandler(activity);
    }
}
