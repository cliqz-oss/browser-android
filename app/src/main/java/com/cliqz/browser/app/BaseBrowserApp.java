package com.cliqz.browser.app;

import android.annotation.SuppressLint;
import android.content.Context;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.multidex.MultiDex;
import androidx.multidex.MultiDexApplication;

import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.MainActivityModule;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.squareup.leakcanary.LeakCanary;

/**
 * @author Ravjit Uppal
 */
public abstract class BaseBrowserApp extends MultiDexApplication {

    @SuppressLint("StaticFieldLeak")
    private static Context sContext;
    private static AppComponent sAppComponent;
    private static boolean sTestInProgress;
    @SuppressLint("StaticFieldLeak")
    private static volatile BaseBrowserApp sBaseBrowserApp = null;

    public BaseBrowserApp() {
        sBaseBrowserApp = this;
    }

    /**
     * All the flavour specific library initializations should be done here.
     */
    public abstract void init();

    @Override
    public void onCreate() {
        super.onCreate();
        Fresco.initialize(this);
        buildDepencyGraph();
        installSupportLibraries();
        sTestInProgress = testInProgres();
        init();
    }

    /**
     * Override this to avoid loading MultiDex library, LeakCanary, Lookback and Facebook.<br>
     * This is usefull for testing purposes.
     */
    protected void installSupportLibraries() {
        LeakCanary.install(this);
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        sContext = base;
        MultiDex.install(this);
        TLSProviderInstaller.install(base);
    }

    public static Context getAppContext() {
        return sContext;
    }

    public static AppComponent getAppComponent() {
        return sAppComponent;
    }

    public static boolean isTestInProgress() { return sTestInProgress; }

    private void buildDepencyGraph() {
        final AppModule appModule = createAppModule();
        sAppComponent = DaggerAppComponent.builder().appModule(appModule).build();
    }

    protected AppModule createAppModule() {
        return new AppModule(this);
    }

    protected boolean testInProgres() { return false; }

    /**
     * Given an object, it checks if an {@link FlavoredActivityComponent} is retrievable from it.
     *
     * @param object any, non-null, object
     * @return an {@link FlavoredActivityComponent} instance or null
     */
    @Nullable
    public static FlavoredActivityComponent getActivityComponent(@Nullable Object object) {
        if (object instanceof ActivityComponentProvider) {
            return ((ActivityComponentProvider) object).getActivityComponent();
        }

        if (object instanceof android.view.ContextThemeWrapper) {
            return getActivityComponent(((android.view.ContextThemeWrapper) object).getBaseContext());
        }

        if (object instanceof androidx.appcompat.view.ContextThemeWrapper) {
            return getActivityComponent(((androidx.appcompat.view.ContextThemeWrapper) object).getBaseContext());
        }

        return null;
    }

    @NonNull
    public static FlavoredActivityComponent createActivityComponent(@NonNull MainActivity activity) {
        if (sBaseBrowserApp == null) {
            throw new RuntimeException("Null Browser App");
        }
        final MainActivityModule module = sBaseBrowserApp.createMainActivityModule(activity);
        return sAppComponent.plus(module);
    }

    @NonNull
    protected MainActivityModule createMainActivityModule(@NonNull MainActivity activity) {
        return new MainActivityModule(activity);
    }
}
