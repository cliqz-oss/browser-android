package com.cliqz.browser.gcm;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.main.MainActivity;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.Robolectric;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ServiceController;
import org.robolectric.annotation.Config;
import org.robolectric.shadows.ShadowNotification;

import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.robolectric.Shadows.shadowOf;

/**
 * @author Stefano Pacifici
 */
@RunWith(RobolectricTestRunner.class)
@Config(constants = BuildConfig.class)
public class MessageListenerServiceTest {

    private static final String NOTIFICATION_TITLE = "Notification Title";
    private static final String NOTIFICATION_HOST = "cliqz.com";
    private static final String NOTIFICATION_URL = "https://" + NOTIFICATION_HOST;
    private ServiceController<MessageListenerService> mServiceController;
    private NotificationManager mNotificationManager;

    @Before
    public void setUp() {
        mServiceController = Robolectric.buildService(MessageListenerService.class);
        mServiceController.create();

        mNotificationManager = (NotificationManager) RuntimeEnvironment.application
                .getSystemService(Context.NOTIFICATION_SERVICE);
    }

    @After
    public void tearDown() {
        mServiceController.destroy();
    }

    @Test
    public void generateNewsNotification() {
        final Bundle data = new Bundle();
        data.putString(MessageListenerService.MessagesKeys.TYPE, "20000");
        data.putString(MessageListenerService.NewsMessagesKeys.TITLE, NOTIFICATION_TITLE);
        data.putString(MessageListenerService.NewsMessagesKeys.URL, NOTIFICATION_URL);

        final MessageListenerService service = mServiceController.get();
        service.onMessageReceived("TEST", data);

        final List<Notification> notifications = shadowOf(mNotificationManager)
                .getAllNotifications();
        assertEquals(1, notifications.size());
        final Notification notification = notifications.get(0);
        final Intent intent = shadowOf(notification.contentIntent).getSavedIntents()[0];
        final ShadowNotification shadowNotification = shadowOf(notification);
        assertEquals(NOTIFICATION_HOST, shadowNotification.getContentTitle());
        assertEquals(NOTIFICATION_TITLE, shadowNotification.getContentText());
        assertEquals(NOTIFICATION_URL, intent.getData().toString());
        assertEquals(Intent.ACTION_VIEW, intent.getAction());
        assertEquals(MainActivity.class, shadowOf(intent).getIntentClass());
    }

}
