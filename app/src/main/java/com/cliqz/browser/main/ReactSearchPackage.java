package com.cliqz.browser.main;

import com.cliqz.browser.reactnative.BrowserActions;
import com.cliqz.browser.reactnative.QuerySuggestion;
import com.cliqz.browser.reactnative.AutoCompletion;
import com.cliqz.browser.reactnative.PermissionManagerModule;
import com.cliqz.browser.reactnative.TelemetryModule;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.List;

import fr.greweb.reactnativeviewshot.RNViewShotModule;

/**
 * @author Khaled Tantawy
 * @author Moaz Mohamed
 */
public class ReactSearchPackage implements ReactPackage {
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();

        modules.add(new BrowserActions(reactContext));
        modules.add(new SubscriptionModule(reactContext));
        modules.add(new QuerySuggestion(reactContext));
        modules.add(new AutoCompletion(reactContext));
        modules.add(new RNViewShotModule(reactContext));
        modules.add(new PermissionManagerModule(reactContext));
        modules.add(new TelemetryModule(reactContext));
        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        List<ViewManager> viewManagers = new ArrayList<>();
        viewManagers.add(new ReactNativeDrawableManager());
        return viewManagers;
    }
}
