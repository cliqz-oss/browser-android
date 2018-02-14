package com.cliqz.browser.utils;

import android.app.AlertDialog;
import android.app.Dialog;
import android.content.Context;
import android.content.DialogInterface;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Log;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Promise;

/**
 * @author Stefano Pacifici
 */
public class ConfirmSubscriptionDialog implements DialogInterface.OnClickListener {

    private final static String TAG = ConfirmSubscriptionDialog.class.getSimpleName();
    private final SubscriptionsManager subscriptionsManager;
    private final Telemetry telemetry;
    private final Bus bus;
    private final CliqzMessages.Subscribe event;

    @Override
    public void onClick(DialogInterface dialog, int which) {
        switch (which) {
            case DialogInterface.BUTTON_POSITIVE:
                subscriptionsManager.addSubscription(event.type, event.subtype, event.id);
                event.resolve();
                bus.post(new Messages.NotifySubscription());
                telemetry.sendSubscriptionSignal(true);
                break;
            default:
                telemetry.sendSubscriptionSignal(false);
                break;
        }
        dialog.dismiss();
    }

    enum Subscription {
        SOCCER_LEAGUE,
        SOCCER_TEAM,
        SOCCER_GAME;

        public static Subscription decode(String type, String subType)
                throws IllegalArgumentException {
            final String value = type.toUpperCase() + "_" + subType.toUpperCase();
            return Subscription.valueOf(value);
        }
    }

    private ConfirmSubscriptionDialog(Bus bus,
                                      SubscriptionsManager subscriptionsManager,
                                      Telemetry telemetry,
                                      CliqzMessages.Subscribe event) {
        this.bus = bus;
        this.subscriptionsManager = subscriptionsManager;
        this.telemetry = telemetry;
        this.event = event;
    }

    @Nullable
    public static Dialog show(@NonNull Context context,
                       @NonNull Bus bus,
                       @NonNull SubscriptionsManager subscriptionsManager,
                       @NonNull Telemetry telemetry,
                       @NonNull CliqzMessages.Subscribe event) {
        try {
            // Decode type
            final Subscription subscriptionType = Subscription.decode(event.type, event.subtype);
            String subscribeWhat;
            switch (subscriptionType) {
                case SOCCER_LEAGUE:
                    subscribeWhat = context.getString(R.string.subscribe_soccer_league);
                    break;
                case SOCCER_TEAM:
                    subscribeWhat = context.getString(R.string.subscribe_soccer_club);
                    break;
                case SOCCER_GAME:
                    subscribeWhat = context.getString(R.string.subscribe_soccer_game);
                    break;
                default:
                    throw new IllegalArgumentException("Wrong type " + event.subtype);
            }
            final String title = context.getString(R.string.subscribe_dialog_title_fmt,
                    subscribeWhat);
            final String message = context.getString(R.string.subscribe_dialog_message_fmt,
                    subscribeWhat);
            final ConfirmSubscriptionDialog listener =
                    new ConfirmSubscriptionDialog(bus, subscriptionsManager, telemetry, event);
            return new AlertDialog.Builder(context)
                    .setTitle(title)
                    .setMessage(message)
                    .setPositiveButton(R.string.subscribe, listener)
                    .setNegativeButton(R.string.action_cancel, listener)
                    .show();
        } catch (IllegalArgumentException e) {
            // Log the message and return null
            Log.e(TAG, "Can't decode subscription type: ", e);
            return null;
        }
    }
}
