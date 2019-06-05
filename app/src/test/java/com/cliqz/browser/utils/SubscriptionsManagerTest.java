package com.cliqz.browser.utils;

import com.cliqz.browser.BuildConfig;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.RuntimeEnvironment;
import org.robolectric.annotation.Config;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.Locale;

import acr.browser.lightning.utils.Utils;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

/**
 * @author Stefano Pacifici
 */
@RunWith(RobolectricTestRunner.class)
@Config(constants = BuildConfig.class)
public class SubscriptionsManagerTest {

    private static final String SOCCER = "soccer";
    private static final String TEAM = "team";
    private static final String TEAM_ID = "1234";
    private static final String TEAM_ID_2 = "2345";
    private static final String TEAM_ID_3 = "3456";
    private static final String MATCH = "match";
    private static final String MATCH_ID = "4321";
    private static final File SUBSCRIPTIONS_FILE = SubscriptionsManager
            .getSubscriptionsFile(RuntimeEnvironment.application);

    private SubscriptionsManager mSubscriptionsManager;

    @Before
    public void setUp() {
        if (SUBSCRIPTIONS_FILE.exists()) {
            //noinspection ResultOfMethodCallIgnored
            SUBSCRIPTIONS_FILE.delete();
        }
        mSubscriptionsManager = new SubscriptionsManager(RuntimeEnvironment.application);
    }

    @Test(timeout = 1000L)
    public void canCreateInstance() {
        WritableMap map = mSubscriptionsManager.toWritableMap();
        assertFalse(map.keySetIterator().hasNextKey());
    }

    @Test(timeout = 10000L)
    public void canExportSubscriptions() {
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID);
        mSubscriptionsManager.addSubscription(SOCCER, MATCH, MATCH_ID);
        final WritableMap subscriptions = mSubscriptionsManager.toWritableMap();
        assertTrue(subscriptions.hasKey(SOCCER));
        final ReadableMap soccer = subscriptions.getMap(SOCCER);
        assertTrue(soccer.hasKey(TEAM));
        assertTrue(soccer.hasKey(MATCH));
        final ReadableArray teams = soccer.getArray(TEAM);
        final ReadableArray matches = soccer.getArray(MATCH);
        assertEquals(1, teams.size());
        assertEquals(1, teams.size());
        assertEquals(TEAM_ID, teams.getString(0));
        assertEquals(MATCH_ID, matches.getString(0));
    }

    // DO NOT REMOVE THE TIMEOUT FROM THIS TEST
    @Test(timeout = 10000L)
    public void itStoresTheSubscriptions() throws InterruptedException, IOException {
        final String subscriptionLine = String.format(Locale.US, "%s|%s|%s",
                SOCCER, TEAM, TEAM_ID);
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID);
        while (true) {
            try {
                assertTrue(SUBSCRIPTIONS_FILE.exists());
                break;
            } catch (AssertionError e) {
                Thread.sleep(200);
            }
        }
        final BufferedReader reader = new BufferedReader(new FileReader(SUBSCRIPTIONS_FILE));
        final String line = reader.readLine();
        Utils.close(reader);
        assertNotNull(line);
        assertEquals(subscriptionLine, line);
    }

    @Test
    public void canRemoveSubscription() {
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID);
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID_2);
        mSubscriptionsManager.removeSubscription(SOCCER, TEAM, TEAM_ID);
        final WritableMap subscriptions = mSubscriptionsManager.toWritableMap();
        final ReadableMap soccer = subscriptions.getMap(SOCCER);
        final ReadableArray teams = soccer.getArray(TEAM);
        assertEquals(1, teams.size());
        assertEquals(TEAM_ID_2, teams.getString(0));
    }

    @Test
    public void canAddSubscription() {
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID);
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID_2);
        assertTrue(mSubscriptionsManager.isSubscribed(SOCCER, TEAM, TEAM_ID));
        assertTrue(mSubscriptionsManager.isSubscribed(SOCCER, TEAM, TEAM_ID_2));
        assertFalse(mSubscriptionsManager.isSubscribed(SOCCER, TEAM, TEAM_ID_3));
    }

    @Test
    public void canResetSubscriptions() {
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID);
        mSubscriptionsManager.addSubscription(SOCCER, TEAM, TEAM_ID_2);
        mSubscriptionsManager.resetSubscriptions();
        assertFalse(mSubscriptionsManager.isSubscribed(SOCCER, TEAM, TEAM_ID));
        assertFalse(mSubscriptionsManager.isSubscribed(SOCCER, TEAM, TEAM_ID_2));
    }
}
