package com.cliqz.browser.app;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.multidex.MultiDex;
import android.support.multidex.MultiDexApplication;

import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.MainActivityModule;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.LookbackWrapper;
import com.facebook.drawee.backends.pipeline.Fresco;
import com.squareup.leakcanary.LeakCanary;

import java.lang.reflect.Method;

public class BrowserApp extends MultiDexApplication {

    @SuppressLint("StaticFieldLeak")
    private static Context sContext;
    private static AppComponent sAppComponent;
    private static boolean sTestInProgress;
    @SuppressLint("StaticFieldLeak")
    private static volatile BrowserApp sBrowserApp = null;

    public BrowserApp() {
        sBrowserApp = this;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Fresco.initialize(this);
        buildDepencyGraph();
        installSupportLibraries();
        sTestInProgress = testInProgres();
    }

    /**
     * Override this to avoid loading MultiDex library, LeakCanary, Lookback and Facebook.<br>
     * This is usefull for testing purposes.
     */
    protected void installSupportLibraries() {
        installMultidex();

        LeakCanary.install(this);
        LookbackWrapper.init(this);
    }

    private void installMultidex() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return; // Nothing to do, multidex is supported natively by ART
        }

        try {
            Class clazz = Class.forName("android.support.multidex.MultiDex");
            @SuppressWarnings("unchecked") Method method = clazz.getMethod("install", Context.class);
            method.invoke(null, this);
        } catch (Throwable e) {
            // We must crash here, we can not recover from not finding the support library
            throw new RuntimeException("Can't install multidex support", e);
        }
    }

    @Override
    protected void attachBaseContext(Context base) {
        super.attachBaseContext(base);
        sContext = base;
        MultiDex.install(this);
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
     * Given an object, it checks if an {@link MainActivityComponent} is retrievable from it.
     *
     * @param object any, non-null, object
     * @return an {@link MainActivityComponent} instance or null
     */
    @Nullable
    public static MainActivityComponent getActivityComponent(@NonNull Object object) {
        if (ActivityComponentProvider.class.isInstance(object)) {
            return ActivityComponentProvider.class.cast(object).getActivityComponent();
        }
        return null;
    }

    @NonNull
    public static MainActivityComponent createActivityComponent(@NonNull MainActivity activity) {
        if (sBrowserApp == null) {
            throw new RuntimeException("Null Browser App");
        }
        final MainActivityModule module = sBrowserApp.createMainActivityModule(activity);
        return sAppComponent.plus(module);
    }

    @NonNull
    protected MainActivityModule createMainActivityModule(@NonNull MainActivity activity) {
        return new MainActivityModule(activity);
    }
}