package com.cliqz.jsengine;

import android.os.Build;
import com.cliqz.nove.Bus;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.JavaScriptModule;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * @author Sam Macbeth
 * @author Moaz Rashad
 */

class JSEngineReactPackage implements ReactPackage {

    private final Engine engine;
    private final Bus bus;

    JSEngineReactPackage(Engine engine, Bus bus) {
        this.engine = engine;
        this.bus = bus;
    }

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new JSBridge(reactContext, this.engine, this.bus));
        modules.add(new RNDeviceInfo(reactContext));
        modules.add(new Crypto(reactContext));
        modules.add(new UserAgentConstants(reactContext));
        modules.add(new LocaleConstants(reactContext));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            modules.add(new WebRequest(reactContext, this.engine));
        }

        return modules;
    }

    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}
