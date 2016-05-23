package com.cliqz.browser.mock;

import android.content.Context;

import acr.browser.lightning.constant.SearchEngines;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * Created by Ravjit on 18/01/16.
 */
public class MockPreferenceManager extends PreferenceManager{

    protected MockPreferenceManager(Context context) {
        super(context);
    }

    @Override
    public boolean getOnBoardingComplete() {
        return true;
    }

    @Override
    public SearchEngines getSearchChoice() {
        return SearchEngines.google;
    }

    @Override
    public boolean getLocationEnabled() {
        return false;
    }
}
