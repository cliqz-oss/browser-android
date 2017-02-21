package com.cliqz.browser.test;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.support.test.InstrumentationRegistry;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;
import android.test.suitebuilder.annotation.LargeTest;

import com.cliqz.browser.main.MainActivity;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * Created by Ravjit on 01/03/16.
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class MainActivityIntentTest {

    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class, true, false);

    /**
     * Test to mock intent when a link is clicked on other apps
     * @throws InterruptedException
     */
    @Test
    public void testIntent() throws Throwable {
        Context targetContext = InstrumentationRegistry.getInstrumentation()
                .getTargetContext();
        Intent intent = new Intent(targetContext, MainActivity.class);
        intent.setAction(Intent.ACTION_VIEW);
        intent.setData(Uri.parse("https://www.google.de"));
        mActivityRule.launchActivity(intent);
        //final WebView webView = mActivityRule.getActivity().firstFragment.mLightningView.getWebView();
        Thread.sleep(10000);
        //CliqzAssertions.assertWebViewUrlContains(webView, "google.de");
    }
}
