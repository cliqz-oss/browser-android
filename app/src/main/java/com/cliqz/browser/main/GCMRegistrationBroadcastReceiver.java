package com.cliqz.browser.main;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.annotations.PerActivity;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 * @date 2016/03/01
 */
@PerActivity
class GCMRegistrationBroadcastReceiver extends BroadcastReceiver{

    private final static String TAG = GCMRegistrationBroadcastReceiver.class.getSimpleName();

    private final Activity activity;
    private final PreferenceManager preferenceManager;

    @Inject
    GCMRegistrationBroadcastReceiver(Activity activity, PreferenceManager preferenceManager) {
        this.activity = activity;
        this.preferenceManager = preferenceManager;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        final boolean sentToken = preferenceManager.isGCMTokenSent();
        if (sentToken) {
            Log.i(TAG, activity.getString(R.string.device_registered));
        } else {
            // @Ravjit should we take some action here? What do you think?
            Log.e(TAG, activity.getString(R.string.error_registering));
        }
    }

    void register() {
        final IntentFilter filter = new IntentFilter(Constants.GCM_REGISTRATION_COMPLETE);
        LocalBroadcastManager.getInstance(activity)
                .registerReceiver(this, filter);
    }

    void unregister() {
        LocalBroadcastManager.getInstance(activity).unregisterReceiver(this);
    }

}
