package com.cliqz.browser.webview;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

/**
 * An enumeration of action that the {@link SearchWebView} can invoke
 *
 * @author Stefano Pacifici
 * @date 2015/10/22
 */
public enum BrowserActionTypes {

    /**
     * Corresponds to the "call somebody" action
     */
    phoneNumber(new IntentCreator() {
        @Nullable
        @Override
        public Intent create(Context context, String data) {
            final String phoneNumber;
            if (data.startsWith("tel:")) {
                phoneNumber = data;
            } else {
                phoneNumber = "tel:" + data;
            }
            return new Intent(Intent.ACTION_DIAL, Uri.parse(phoneNumber));
        }
    }),

    /**
     * Every thing we do not know how to handle
     */
    unknown(new IntentCreator() {
        @Nullable
        @Override
        public Intent create(Context context, String data) {
            return null;
        }
    });

    private final IntentCreator intentCreator;

    BrowserActionTypes(@NonNull final IntentCreator intentCreator) {
        this.intentCreator = intentCreator;
    }

    /**
     * Handle conversion from a string representation of the type to a {@link BrowserActionTypes}
     * element. It converts any string, even null ones, without complaining
     *
     * @param type a string representation of the type
     * @return always a {@link BrowserActionTypes} element
     */
    @NonNull
    public static BrowserActionTypes fromTypeString(final String type) {
        BrowserActionTypes action = unknown;
        try {
            action = valueOf(type);
        } catch (IllegalArgumentException e) {
            // Swallow the exception, we just return unknown
        }
        return action;
    }

    /**
     * Return the appropriate {@link Intent} for the desired {@link BrowserActionTypes}
     *
     * @param context a non-null context used to create the intent
     * @param data a non-null string representing the data associated with the action
     * @return an {@link Intent} or null if the action is {@link BrowserActionTypes#unknown}
     */
    @Nullable
    public Intent getIntent(@NonNull Context context, @NonNull String data) {
        return intentCreator.create(context, data);
    }

    // Used internally to construct actions that can create appropriate intents
    interface IntentCreator {
        @Nullable
        Intent create(final Context context, final String data);
    }
}
