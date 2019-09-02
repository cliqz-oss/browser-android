package com.cliqz.browser.abtesting;

import androidx.annotation.VisibleForTesting;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.HttpHandler;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
public class ABTestFetcher {

    private static final String AB_TEST_ENDPOINT = "https://stats.cliqz.com/abtests/check?session=";

    @Inject
    PreferenceManager preferenceManager;

    public ABTestFetcher() {
        BrowserApp.getAppComponent().inject(this);
    }

    public void fetchTestList() {
        if (preferenceManager.getSessionId() == null) {
            return;
        }
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final JSONObject response = (JSONObject) HttpHandler.sendRequest("GET", new URL(AB_TEST_ENDPOINT
                                    + URLEncoder.encode(preferenceManager.getSessionId(), "UTF-8")),
                            "CONTENT_TYPE_JSON", null, null);
                    parseResponse(response);
                } catch (MalformedURLException | UnsupportedEncodingException e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    private synchronized void parseResponse(final JSONObject response) {
        if (response == null) {
            return;
        }
        try {
            findExitingTests(response, preferenceManager);
            preferenceManager.setABTestList(response.toString());
            final JSONArray testsArray = response.names();
            if (testsArray == null) {
                return;
            }

            for (int i = 0; i < testsArray.length(); i++) {
                final String[] testParams = testsArray.getString(i).split("_");
                final int testId = Integer.parseInt(testParams[0]);
                final String testGroup = testParams[1];
                for (AvailableTests test : AvailableTests.values()) {
                    if (testId == test.testId) {
                        preferenceManager.setABTestPreference(test.preferenceName,
                                testGroup.equals("B"));
                        break;
                    }
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }

    @VisibleForTesting
    void findExitingTests(final JSONObject response, final PreferenceManager preferenceManager) {
        try {
            final JSONArray oldListJson = new JSONObject(preferenceManager.getABTestList()).names();
            if (oldListJson == null) {
                return;
            }
            final ArrayList<String> oldTestList = new ArrayList<>();
            for (int i = 0; i < oldListJson.length(); i++) {
                final String[] testParams = oldListJson.getString(i).split("_");
                oldTestList.add(testParams[0]);
            }
            final JSONArray newListJson = response.names();
            for (int i = 0; i < newListJson.length(); i++) {
                final String[] testParams = newListJson.getString(i).split("_");
                oldTestList.remove(testParams[0]);
            }
            //the remaining elements in the list are exiting tests.
            for (String testId : oldTestList) {
                for (AvailableTests tests : AvailableTests.values()) {
                    if (tests.testId == Integer.parseInt(testId)) {
                        preferenceManager.setABTestPreference(tests.preferenceName, false);
                    }
                }
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
    }
}
