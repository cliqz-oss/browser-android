package com.cliqz.browser.abtesting;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.app.TestBrowserApp;

import org.json.JSONException;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;

import acr.browser.lightning.preference.PreferenceManager;

import static junit.framework.Assert.assertTrue;
import static org.mockito.Matchers.anyBoolean;
import static org.mockito.Matchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * @author Ravjit Uppal
 */
@RunWith(RobolectricTestRunner.class)
@Config(constants = BuildConfig.class, application = TestBrowserApp.class)
public class ABTestFetcherTest {

    public ABTestFetcherTest() {
    }

    private static final String oldList = "{'1024_B':{},'1028_B':{},'1089_A':{},'1095_A':{},'1094_A':{}}";
    private static final String newList = "{'1024_B':{},'1028_B':{},'1092_A':{},'1094_A':{},'1096_A':{}}";
    private boolean didQuerySuggestionExit = false;
    private boolean didConnectExit = false;

    @Test
    public void testABTestExit() {
        final PreferenceManager mockPreferenceManager = mock(PreferenceManager.class);
        when(mockPreferenceManager.getABTestList()).thenReturn(oldList);
        doAnswer(new Answer<Void>() {
            @Override
            public Void answer(InvocationOnMock invocation) throws Throwable {
                Object[] args = invocation.getArguments();
                if (args[0].equals(AvailableTests.QUERYS_UGGESTIONS.preferenceName)
                        && !((Boolean) args[1])) {
                    didQuerySuggestionExit = true;
                } else if (args[0].equals(AvailableTests.CONNECT.preferenceName)
                        && !((Boolean) args[1])) {
                    didConnectExit = true;
                }
                return null;
            }
        }).when(mockPreferenceManager).setABTestPreference(anyString(), anyBoolean());
        try {
            new ABTestFetcher().findExitingTests(new JSONObject(newList), mockPreferenceManager);
        } catch (JSONException e) {
            e.printStackTrace();
        }
        assertTrue(didConnectExit);
        assertTrue(didQuerySuggestionExit);
    }
}
