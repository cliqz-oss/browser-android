package com.cliqz.browser.test;

import android.support.test.espresso.action.ViewActions;
import android.support.test.espresso.web.webdriver.Locator;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;
import android.test.suitebuilder.annotation.LargeTest;
import android.webkit.WebView;

import com.cliqz.browser.main.MainActivity;

import org.hamcrest.Matchers;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import com.cliqz.browser.R;

import static android.support.test.espresso.Espresso.closeSoftKeyboard;
import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.Espresso.pressBack;
import static android.support.test.espresso.action.ViewActions.clearText;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.action.ViewActions.pressImeActionButton;
import static android.support.test.espresso.action.ViewActions.typeText;
import static android.support.test.espresso.action.ViewActions.typeTextIntoFocusedView;
import static android.support.test.espresso.assertion.ViewAssertions.matches;
import static android.support.test.espresso.matcher.ViewMatchers.withClassName;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static android.support.test.espresso.matcher.ViewMatchers.withText;
import static android.support.test.espresso.web.sugar.Web.onWebView;
import static android.support.test.espresso.web.webdriver.DriverAtoms.findElement;
import static android.support.test.espresso.web.webdriver.DriverAtoms.webClick;
import static org.hamcrest.Matchers.containsString;

/**
 * Created by Ravjit on 21/12/15.
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class MainActivityTest {

    @Rule
    public ActivityTestRule<MainActivity> mActivityRule = new ActivityTestRule<>(MainActivity.class);

/*
    @Test
    public void testEnter() throws Throwable {
        final WebView webView = mActivityRule.getActivity().mMainFragment.mLightningView.getWebView();
        onView(withId(R.id.search_edit_text)).perform(typeText("yahoo.com"), pressImeActionButton());
        Thread.sleep(5000);
        onView(withId(R.id.title_bar)).perform(click());
        CliqzAssertions.assertWebViewUrlContains(webView, "yahoo.com");
        onView(withId(R.id.search_edit_text)).perform(typeTextIntoFocusedView("pippo "), pressImeActionButton());
        Thread.sleep(5000);
        onView(withId(R.id.title_bar)).perform(click());
        CliqzAssertions.assertWebViewUrlContains(webView, "pippo");
        CliqzAssertions.assertWebViewUrlContains(webView, "google");
    }
*/

    @Test
    public void testTrampoline() throws InterruptedException {
        onView(withId(R.id.search_edit_text)).perform(clearText());
        onView(withId(R.id.search_edit_text)).perform(typeText("Rafael Nadal wiki"));
        Thread.sleep(5000);
        onWebView(withClassName(Matchers.containsString("SearchWebView"))).withElement(findElement(Locator.CLASS_NAME, "cqz-result-box")).perform(webClick());
        Thread.sleep(5000);
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text)).check(matches(withText(containsString("wikipedia.org/wiki/Rafael_Nadal"))));
        onView(withId(R.id.search_edit_text)).perform(typeTextIntoFocusedView("Roger Federer wiki"));
        Thread.sleep(5000);
        onWebView(withClassName(Matchers.containsString("SearchWebView"))).withElement(findElement(Locator.CLASS_NAME, "cqz-result-box")).perform(webClick());
        Thread.sleep(5000);
        pressBack();
        Thread.sleep(5000);
        onView(withId(R.id.search_edit_text)).check(matches(withText("Roger Federer wiki")));
        closeSoftKeyboard();
        pressBack();
        Thread.sleep(5000);
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text)).check(matches(withText(containsString("wikipedia.org/wiki/Rafael_Nadal"))));
        closeSoftKeyboard();
        pressBack();
        Thread.sleep(5000);
        onView(withId(R.id.search_edit_text)).check(matches(withText("Rafael Nadal wiki")));
    }

/*
    @Test
    public void testAutoComplete() throws Throwable {
        final WebView webView = mActivityRule.getActivity().mMainFragment.mLightningView.getWebView();
        onView(withId(R.id.search_edit_text)).perform(clearText());
        onView(withId(R.id.search_edit_text)).perform(typeText("face"));
        Thread.sleep(5000);
        onView(withId(R.id.search_edit_text)).perform(pressImeActionButton());
        CliqzAssertions.assertWebViewUrlContains(webView, "facebook");
    }
*/
}
