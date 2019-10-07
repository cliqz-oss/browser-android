package com.cliqz.browser.mock;

import android.content.Context;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * Created by Ravjit on 18/01/16.
 */
public class MockPreferenceManager extends PreferenceManager{

    public MockPreferenceManager(Context context) {
        super(context);
    }

    @Override
    public boolean getOnBoardingComplete() {
        return true;
    }

    @Override
    public boolean getShouldShowOnboarding() {
        return false;
    }

    @Override
    public boolean getShouldShowAntiTrackingDescription() {
        return false;
    }

    @Override
    public boolean getShouldShowSearchDescription() {
        return false;
    }

    @Override
    public boolean getCloseTabsExit() {
        return true;
    }

    @Override
    public boolean getRestoreLostTabsEnabled() {
        return false;
    }

    @Override
    public String getSavedUrl() {
        return null;
    }

    @Override
    public int getStartsCount() {
        return 1;
    }

    // @Override
    public boolean getLocationEnabled() {
        return false;
    }

    @Override
    public boolean getPopupsEnabled() {
        return false;
    }

    @Override
    public boolean shouldShowOnboardingv2() {
        return false;
    }
}
