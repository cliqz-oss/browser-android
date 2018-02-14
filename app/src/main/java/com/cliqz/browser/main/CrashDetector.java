package com.cliqz.browser.main;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * CrashDetector contains the logic to detect crashes.
 *
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public class CrashDetector {

    private int mLastState;
    private final PreferenceManager preferenceManager;
    private boolean mHasCrashed;

    public static class State {
        public static final int UNKNOWN = 0;
        public static final int CREATED = 1;
        public static final int RESUMED = 2;
        public static final int PAUSED = 3;

        private State() {} // No instances
    }

    public CrashDetector(PreferenceManager preferenceManager) {
        this.preferenceManager = preferenceManager;
        this.mLastState = preferenceManager.getMainActivityLastState();
        this.mHasCrashed = false;
    }

    public void notifyOnCreate() {
        final int lastState = mLastState;
        preferenceManager.setMainActivityLastState(State.CREATED);
        mLastState = State.CREATED;
        mHasCrashed = lastState == State.CREATED || lastState == State.RESUMED;
    }

    public void notifyOnResume() {
        preferenceManager.setMainActivityLastState(State.RESUMED);
        mLastState = State.RESUMED;
    }

    public void notifyOnPause() {
        preferenceManager.setMainActivityLastState(State.PAUSED);
        mLastState = State.PAUSED;
    }

    public boolean hasCrashed() {
        return mHasCrashed;
    }

    public void resetCrash() {
        mHasCrashed = false;
    }
}
