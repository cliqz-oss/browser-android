package com.cliqz.browser.test;

import android.app.Application;
import android.content.Context;
import android.support.test.runner.AndroidJUnitRunner;

import com.cliqz.browser.mock.MockBrowserApp;

/**
 * Created by Ravjit on 18/01/16.
 */
public class CustomTestRunner extends AndroidJUnitRunner {

    @Override
    public Application newApplication(ClassLoader cl, String className, Context context) throws InstantiationException, IllegalAccessException, ClassNotFoundException {
        return super.newApplication(cl, MockBrowserApp.class.getName(), context);
    }
}
