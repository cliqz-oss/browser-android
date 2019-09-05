package com.cliqz.browser.main;


import android.content.Context;
import android.os.Handler;

import androidx.annotation.NonNull;

/**
 * A class to provide an handler that run on the main thread wherever is needed.
 *
 * @author Stefano Pacifici
 */
public class MainThreadHandler extends Handler {

    public MainThreadHandler(@NonNull Context context) {
        super(context.getMainLooper());
    }
}