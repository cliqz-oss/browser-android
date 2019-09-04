package com.cliqz.browser.main;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import javax.inject.Inject;

import timber.log.Timber;

/**
 * @author Khaled Tantawy
 */
public class SearchModule extends ReactContextBaseJavaModule {

    @Inject
    Bus bus;

    public SearchModule(ReactApplicationContext reactContext) {
        super(reactContext);

        final AppComponent component = BrowserApp.getAppComponent();
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public String getName() {
        return "SearchModule";
    }

    @ReactMethod
    public void openLink(String url) {
        if (url != null) {
            bus.post(CliqzMessages.OpenLink.open(url));
            Timber.d("Open link: %s", url);
        }
    }
}