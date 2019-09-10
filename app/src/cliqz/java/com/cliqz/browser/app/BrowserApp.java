package com.cliqz.browser.app;

import com.cliqz.browser.messaging.MessagingHandler;

public class BrowserApp extends BaseBrowserApp {

    @Override
    public void init() {
        //intialize common libraries
        super.init();
        //initialize flavour specific libraries below iff any
        MessagingHandler.getInstance().init();
    }
}