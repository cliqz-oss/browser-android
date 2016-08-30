package com.cliqz.browser.app;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.os.Message;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.di.components.AppComponent;
import com.cliqz.browser.di.components.DaggerAppComponent;
import com.cliqz.browser.di.modules.AppModule;
import com.cliqz.browser.utils.LookbackWrapper;
import com.squareup.leakcanary.LeakCanary;

public class BrowserApp extends Application {

    private static Context sContext;
    private static AppComponent sAppComponent;
    private static Message sNewTabMessage;

    @Override
    public void onCreate() {
        super.onCreate();
        LeakCanary.install(this);
        LookbackWrapper.init(this);
        buildDepencyGraph();
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
