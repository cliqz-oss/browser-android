package com.cliqz.browser.app;

/**
 * @author Stefano Pacifici
 */
public class TestBrowserApp extends BrowserApp {

    @Override
    protected void installSupportLibraries() {
        // Avoid loading libraries
    }

    @Override
    protected boolean testInProgres() {
        return true;
    }
}
