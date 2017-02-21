package com.cliqz.browser.gcm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.utils.TelemetryKeys;

import javax.inject.Inject;

/**
 * Created by Ravjit on 09/05/16.
 */
public class NotificationDismissedReceiver extends BroadcastReceiver {

    @Inject
    Telemetry telemetry;

    public NotificationDismissedReceiver() {
        super();
        BrowserApp.getAppComponent().inject(this);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        telemetry.sendNewsNotificationSignal(TelemetryKeys.DISMISS, true);
    }
}
