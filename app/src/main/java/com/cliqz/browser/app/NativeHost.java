package com.cliqz.browser.app;

import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;

import java.util.Collections;
import java.util.List;

/**
 * @author Khaled Tantawy
 */
class NativeHost extends ReactNativeHost {
    NativeHost(BrowserApp application) {
        super(application);
    }

    @Override
    public boolean getUseDeveloperSupport() {
        return false;
    }

    @Override
    protected List<ReactPackage> getPackages() {
        return Collections.<ReactPackage>singletonList(new MainReactPackage());
    }
}
