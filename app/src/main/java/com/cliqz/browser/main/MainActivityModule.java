package com.cliqz.browser.main;

import android.app.Activity;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.utils.BloomFilterUtils;
import com.cliqz.browser.webview.CliqzBridge;
import com.cliqz.browser.webview.SearchWebView;
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
    CliqzBridge provideCliqzBridge(SearchWebView searchWebView) {
        return searchWebView.getBridge();
    }

//    @Provides
//    JSBridge provideJSBridge(Engine engine) {
//        try {
//            return engine.getBridge();
//        } catch (EngineNotYetAvailable engineNotYetAvailable) {
//            engineNotYetAvailable.printStackTrace();
//        }
//        return null;
//    }



    @Provides
    public Activity providesActivity() {
        return activity;
    }

    @PerActivity
    @Provides
    public TabsManager providesTabsManager() {
        return new TabsManager(activity.getSupportFragmentManager());
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

    @PerActivity
    @Provides
    public SearchWebView provideSearchWebView(Activity activity) {
        return new SearchWebView(activity);
    }

    @PerActivity
    @Provides
    SearchView providesSearchView(Activity activity, Engine engine) {
        return new SearchView(activity, engine);
    }

    @PerActivity
    @Provides
    public CrashDetector provideCrashDetector(PreferenceManager preferenceManager) {
        return new CrashDetector(preferenceManager);
    }

    @PerActivity
    @Provides
    public MainActivityHandler providesMainActivityHandler() {
        return new MainActivityHandler(activity);
    }
}
