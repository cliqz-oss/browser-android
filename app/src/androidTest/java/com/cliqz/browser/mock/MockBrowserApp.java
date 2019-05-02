package com.cliqz.browser.mock;

import com.cliqz.browser.app.AppModule;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.app.MockAppModule;

/**
 * Created by Ravjit on 18/01/16.
 */
public class MockBrowserApp extends BrowserApp {

    @Override
    protected AppModule createAppModule() {
        return new MockAppModule(this);
    }

    @Override
    protected boolean testInProgres() {
        return true;
    }
}
