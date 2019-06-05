package com.cliqz.browser.main;

public class OnBoardingHelper {
    public static final String ONBOARDING_VERSION = "99.0";

    @SuppressWarnings("unused")
    public OnBoardingHelper(MainActivity activity) {
        // No-op
    }

    boolean conditionallyShowSearchDescription() {
        return false;
    }

    public boolean close() {
        return false;
    }

    boolean conditionallyShowAntiTrackingDescription() {
        return false;
    }

    void conditionallyShowYouTubeDescription() {
        // No-op
    }
}
