package com.cliqz.browser.mock;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.modules.AppModule;

/**
 * Created by Ravjit on 18/01/16.
 */
public class MockBrowserApp extends BrowserApp {

    @Override
    protected AppModule createAppModule() {
        return new MockAppModule(this);
    }

}
