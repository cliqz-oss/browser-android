package com.cliqz.browser.gcm;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.gcm.MessageListenerService.MessagesKeys;
import com.cliqz.browser.gcm.MessageListenerService.SoccerMessagesKeys;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.utils.SubscriptionsManager;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.ParameterizedRobolectricTestRunner;
import org.robolectric.Robolectric;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.android.controller.ServiceController;
import org.robolectric.annotation.Config;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.when;
import static org.robolectric.Shadows.shadowOf;

/**
 * @author Stefano Pacifici
 */
@RunWith(ParameterizedRobolectricTestRunner.class)
@Config(constants = BuildConfig.class)
public class SubscriptionsTest {

    private static final String SOCCER_TYPE = "30000";
    private static final String SAMPLE_LEAGUE_ID = "900";
    private static final String NOTIFICATION_MESSAGE = "" +
            "Goal for (a very long team name for testing) (15 min. of play)! " +
            "(a very long team name for testing)   1:0   (a very long team name for testing)";
    private static final String SAMPLE_MATCH_ID = "3972407";
    private static final String SAMPLE_TEAM1_ID = "908";
    private static final String SAMPLE_TEAM2_ID = "915";
    private static final String SAMPLE_EVENT_LINK = "https://cliqz.com";

    private final String type;
    private final String subType;
    private final String value;

    private ServiceController<MessageListenerService> mServiceController;
    private SubscriptionsManager mMockSubscriptionManager;
    private NotificationManager mNotificationManager;
    private MessageListenerService mService;

    @ParameterizedRobolectricTestRunner.Parameters(name = "{0} - {1} - {2}")
    public static Collection<Object[]> data() {
        return Arrays.asList(new Object[][] {
                {"soccer", "game", SAMPLE_MATCH_ID},
                {"soccer", "league", SAMPLE_LEAGUE_ID},
                {"soccer", "team", SAMPLE_TEAM1_ID},
                {"soccer", "team", SAMPLE_TEAM2_ID}
        });
    }

    public SubscriptionsTest(String type, String subType, String value) {
        this.type = type;
        this.subType = subType;
        this.value = value;
    }

    @Before
    public void setUp() {
        mServiceController = Robolectric.buildService(MessageListenerService.class);
        mServiceController.create();

        mMockSubscriptionManager = mock(SubscriptionsManager.class);
        mService = mServiceController.get();
        mService.subscriptionsManager = mMockSubscriptionManager;

        mNotificationManager = (NotificationManager) RuntimeEnvironment.application
                .getSystemService(Context.NOTIFICATION_SERVICE);
    }

    @After
    public void tearUp() {
        mService = null;
        mServiceController.destroy();
    }

    @Test
    public void shouldGenerateNotification() {
        reset(mMockSubscriptionManager);
        when(mMockSubscriptionManager.isSubscribed(type, subType, value)).thenReturn(true);

        final Bundle data = generateDataBundle();
        mService.onMessageReceived("TEST", data);
        final List<Notification> notifications = shadowOf(mNotificationManager)
                .getAllNotifications();
        assertEquals(1, notifications.size());
        final Notification notification = notifications.get(0);
        final Intent intent = shadowOf(notification.contentIntent).getSavedIntents()[0];
        assertEquals(SAMPLE_EVENT_LINK, intent.getData().toString());
        assertEquals(Intent.ACTION_VIEW, intent.getAction());
        assertEquals(MainActivity.class, shadowOf(intent).getIntentClass());
    }

    @Test
    public void shouldNotGenerateNotification() {
        reset(mMockSubscriptionManager);

        mService.onMessageReceived("TEST", generateDataBundle());

        final List<Notification> notifications = shadowOf(mNotificationManager)
                .getAllNotifications();
        assertEquals(0, notifications.size());
    }

    private Bundle generateDataBundle() {
        final Bundle data = new Bundle();
        data.putString(MessagesKeys.TYPE, SOCCER_TYPE);
        data.putString(SoccerMessagesKeys.LEAGUE_ID, SAMPLE_LEAGUE_ID);
        data.putString(SoccerMessagesKeys.MESSAGE, NOTIFICATION_MESSAGE);
        data.putString(SoccerMessagesKeys.MATCH_ID, SAMPLE_MATCH_ID);
        data.putString(SoccerMessagesKeys.TEAM_IDS, SAMPLE_TEAM1_ID + "," + SAMPLE_TEAM2_ID);
        data.putInt(SoccerMessagesKeys.TIMESTAMP, 1502701836);
        data.putString(SoccerMessagesKeys.URL, SAMPLE_EVENT_LINK);
        return data;
    }
}
