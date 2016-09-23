package com.cliqz.browser.app;

import android.app.Application;
import android.content.Context;
import android.os.Build;
import android.os.Message;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.di.components.AppComponent;
import com.cliqz.browser.di.components.DaggerAppComponent;
import com.cliqz.browser.di.modules.AppModule;
import com.cliqz.browser.utils.LookbackWrapper;
import com.squareup.leakcanary.LeakCanary;

import java.lang.reflect.Method;

public class BrowserApp extends Application {

    private static Context sContext;
    private static AppComponent sAppComponent;
    private static Message sNewTabMessage;

    @Override
    public void onCreate() {
        super.onCreate();
        installMultidex();

        LeakCanary.install(this);
        LookbackWrapper.init(this);
        buildDepencyGraph();
    }

    private void installMultidex() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return; // Nothing to do, multidex is supported natively by ART
        }

        try {
            Class clazz = Class.forName("android.support.multidex.MultiDex");
            Method method = clazz.getMethod("install", Context.class);
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
    }

    public static Context getAppContext() {
        return sContext;
    }

    public static AppComponent getAppComponent() {
        return sAppComponent;
    }

    private void buildDepencyGraph() {
        final AppModule appModule = createAppModule();
        sAppComponent = DaggerAppComponent.builder().appModule(appModule).build();
    }

    protected AppModule createAppModule() {
        return new AppModule(this);
    }

    // TODO: This is an hack to make new tab creation to work please remove asap
    public static void pushNewTabMessage(Message msg) {
        sNewTabMessage = msg;
    }

    public static Message popNewTabMessage() {
        final Message result = sNewTabMessage;
        sNewTabMessage = null;
        return result;
    }

    public static boolean hasNewTabMessage() {
        return sNewTabMessage != null;
    }

    /**
     * Given an object, it checks if an {@link ActivityComponent} is retrievable from it.
     *
     * @param object any, non-null, object
     * @return an {@link ActivityComponent} instance or null
     */
    @Nullable
    public static ActivityComponent getActivityComponent(@NonNull Object object) {
        if (ActivityComponentProvider.class.isInstance(object)) {
            return ActivityComponentProvider.class.cast(object).getActivityComponent();
        }
        return null;
    }
}
