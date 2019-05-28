package com.cliqz.browser.main;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.RingtoneManager;
import android.net.Uri;
import androidx.core.app.NotificationCompat;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BaseComponent;
import com.cliqz.browser.app.BaseModule;
import com.cliqz.browser.app.DaggerBaseComponent;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 */
public final class AppUpdateReceiver extends BroadcastReceiver {

    private static final String VER_1_3_0 = "1.3.0";

    @Inject
    PreferenceManager preferenceManager;

    @Override
    public void onReceive(Context context, Intent intent) {
        final BaseComponent component = DaggerBaseComponent.builder()
                .baseModule(new BaseModule(context)).build();
        component.inject(this);

        final int latestVersion = preferenceManager.getLatestAppVersion();
        final int version = BuildConfig.VERSION_CODE;

        if (latestVersion == version) {
            // Downgrade or reinstall
            return;
        }

        preferenceManager.setLastAppVersion(version);

        // We check the version name here
        if (BuildConfig.VERSION_NAME.startsWith(VER_1_3_0)) {
            displayIconChangedNotification(context);
        }

    }

    private void displayIconChangedNotification(Context context) {
        final Bitmap largeIcon =
                BitmapFactory.decodeResource(context.getResources(), R.mipmap.ic_launcher);
        final NotificationCompat.Builder builder = new NotificationCompat.Builder(context);
        final Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        final Intent intent = new Intent(context, MainActivity.class);
        final PendingIntent pendingIntent = PendingIntent.getActivities(context, 0,
                new Intent[] {intent}, PendingIntent.FLAG_ONE_SHOT);
        final NotificationCompat.BigTextStyle style = new NotificationCompat.BigTextStyle();
        style.bigText(context.getString(R.string.msg_new_icon));
        builder.setSmallIcon(R.drawable.ic_notification_news)
                .setLargeIcon(largeIcon)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setSmallIcon(R.drawable.ic_notification_news)
                .setContentTitle(context.getString(R.string.app_name))
                .setContentText(context.getString(R.string.msg_new_icon))
                .setAutoCancel(true)
                .setSound(defaultSoundUri)
                .setContentIntent(pendingIntent)
                .setStyle(style);

        final NotificationManager manager =
                (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(0, builder.build());
    }
}
