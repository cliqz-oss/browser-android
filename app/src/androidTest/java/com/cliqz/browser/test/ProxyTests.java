package com.cliqz.browser.test;

import android.content.Intent;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivity;

import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.AbstractHandler;
import org.junit.After;
import org.junit.AfterClass;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;

import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.Espresso.pressBack;
import static android.support.test.espresso.action.ViewActions.clearText;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.action.ViewActions.typeText;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static android.support.test.espresso.matcher.ViewMatchers.withText;
import static org.hamcrest.Matchers.equalToIgnoringCase;


/**
 * @author Stefano Pacifici
 * @date 2016/07/12
 */
@RunWith(AndroidJUnit4.class)
public class ProxyTests {

    private static Server sServer;
    private static RequestsHandler sRequestsHandler;

    @Rule
    public final ActivityTestRule<MainActivity> rule = new ActivityTestRule<MainActivity>(MainActivity.class);
    private MainActivity mMainActivity;

    @BeforeClass
    public static void setupServer() throws Exception {
        sServer = new Server(8080);
        sRequestsHandler = new RequestsHandler();
        sServer.setHandler(sRequestsHandler);
        sServer.start();
    }

    @AfterClass
    public static void shutdownServer() throws Exception {
        sServer.stop();
        sServer.join();
    }

    public ProxyTests() {
        final Intent intent = new Intent();
        intent.putExtra(Constants.KEY_DO_NOT_SHOW_ONBOARDING, true);
        mMainActivity = rule.launchActivity(intent);
    }

    @Before
    public void before() {
        resetProxySettings();
    }

    @After
    public void after() {
        resetProxySettings();
    }

    private void resetProxySettings() {
        final PreferenceManager preferenceManager =
                BrowserApp.getAppComponent().getPreferenceManager();
        preferenceManager.setProxyChoice(Constants.NO_PROXY);
        preferenceManager.setProxyHost("localhost");
        preferenceManager.setProxyPort(8118);
    }

    @Test
    public void shouldCallTheProxy() throws InterruptedException {
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.settings_menu_button)).perform(click());
        onView(withText("Advanced")).perform(click());
        onView(withText("HTTP Proxy")).perform(click());
        onView(withText("Manual")).perform(click());
        onView(withId(R.id.proxyHost)).perform(clearText(),typeText("127.0.0.1"));
        onView(withId(R.id.proxyPort)).perform(clearText(), typeText("8080"));
        onView(withText(equalToIgnoringCase("ok"))).perform(click());
        onView(withText(equalToIgnoringCase("ok"))).perform(click());
        pressBack();
        pressBack();
        onView(withId(R.id.search_edit_text)).perform(typeText("http://test.it"));
        assertTrue("Should have at least a request", sRequestsHandler.getHandledRequests() > 0);
    }

    private static class RequestsHandler extends AbstractHandler {
        private int handledRequests = 0;

        public int getHandledRequests() { return handledRequests; }

        @Override
        public void handle(String target, Request baseRequest, HttpServletRequest request, HttpServletResponse response) throws IOException, ServletException {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("text/plain");
            response.getOutputStream().write("STANDARD RESPONSE".getBytes());
            baseRequest.setHandled(true);
            handledRequests++;
        }
    }
}
