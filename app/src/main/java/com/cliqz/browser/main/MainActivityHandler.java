package com.cliqz.browser.main;


import android.os.Handler;

/**
 * A class to provide an handler that run on the main thread wherever is needed
 *
 * @author Stefano Pacifici
 */
public class MainActivityHandler extends Handler {

    public MainActivityHandler(MainActivity activity) {
        super(activity.getMainLooper());
    }
}