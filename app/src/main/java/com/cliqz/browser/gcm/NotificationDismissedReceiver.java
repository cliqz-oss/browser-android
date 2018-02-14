package com.cliqz.browser.gcm;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BaseComponent;
import com.cliqz.browser.app.BaseModule;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.app.DaggerBaseComponent;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;

/**
 * @author Ravjit Uppal
 */
public class NotificationDismissedReceiver extends BroadcastReceiver {

    @Inject
    Telemetry telemetry;

    public NotificationDismissedReceiver() {
        super();
        final AppComponent appComponent = BrowserApp.getAppComponent();
        if (appComponent != null) {
            BrowserApp.getAppComponent().inject(this);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (telemetry == null) {
            final BaseComponent component =
                    DaggerBaseComponent.builder().baseModule(new BaseModule(context)).build();
            component.inject(this);
        }
        final String rawType = intent.getStringExtra(Constants.NOTIFICATION_TYPE);
        final String type = rawType != null ? rawType : "unknown";
        telemetry.sendNotificationSignal(TelemetryKeys.DISMISS, type, true);
    }
}
