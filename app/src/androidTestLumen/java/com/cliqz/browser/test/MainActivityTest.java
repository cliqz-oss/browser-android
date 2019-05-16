package com.cliqz.browser.test;

import android.content.Context;
import android.support.test.InstrumentationRegistry;
import android.support.test.espresso.Espresso;
import android.support.test.espresso.web.assertion.WebViewAssertions;
import android.support.test.espresso.web.matcher.DomMatchers;
import android.support.test.espresso.web.webdriver.Locator;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;
import android.util.Log;
import android.view.KeyEvent;

import com.cliqz.browser.R;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.utils.ViewHelpers;
import com.cliqz.browser.utils.WebHelpers;
import com.cliqz.browser.widget.OverFlowMenu;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TestName;
import org.junit.runner.RunWith;

import java.io.File;

import acr.browser.lightning.view.CliqzWebView;

import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.action.ViewActions.pressBack;
import static android.support.test.espresso.action.ViewActions.pressKey;
import static android.support.test.espresso.action.ViewActions.swipeLeft;
import static android.support.test.espresso.action.ViewActions.typeText;
import static android.support.test.espresso.assertion.ViewAssertions.matches;
import static android.support.test.espresso.matcher.ViewMatchers.hasFocus;
import static android.support.test.espresso.matcher.ViewMatchers.isDisplayed;
import static android.support.test.espresso.matcher.ViewMatchers.withClassName;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static android.support.test.espresso.matcher.ViewMatchers.withText;
import static android.support.test.espresso.web.assertion.WebViewAssertions.webMatches;
import static android.support.test.espresso.web.sugar.Web.onWebView;
import static android.support.test.espresso.web.webdriver.DriverAtoms.findElement;
import static android.support.test.espresso.web.webdriver.DriverAtoms.getText;
import static android.support.test.espresso.web.webdriver.DriverAtoms.webClick;
import static com.cliqz.browser.utils.ViewHelpers.clickXY;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;

/**
 * @author Sharath Ganesh Pai
 */

@RunWith(AndroidJUnit4.class)
public class MainActivityTest {

    @Rule
    public TestName testName = new TestName();

    @Rule
    public ActivityTestRule<MainActivity>
            mActivityRule = new ActivityTestRule<>(MainActivity.class, false, false);

    @Before
    public void setUp() {
        Espresso.setFailureHandler(new CustomFailureHandler(mActivityRule.launchActivity(null)));
    }

    @After
    public void tearDown() {
        DeviceShellHelper.takeScreenshot(testName.getMethodName());
        mActivityRule.getActivity().goToOverView(new Messages.GoToOverview());
        while(true){
            try {
                onView(withId(R.id.closeBtn)).perform(click());
            } catch (Exception e) {
                break;
            }
        }
    }

    public void resetApp() {
        try {
            File root = InstrumentationRegistry.getTargetContext().getFilesDir().getParentFile();
            String[] sharedPreferencesFileNames = new File(root, "shared_prefs").list();
            for (String fileName : sharedPreferencesFileNames) {
                InstrumentationRegistry.getTargetContext()
                        .getSharedPreferences(
                                fileName.replace(".xml", ""), Context.MODE_PRIVATE)
                        .edit()
                        .clear()
                        .commit();
            }
            /* Presently Not Working o/
            String[] tabsFiles = new File(root, "files/tabs").list();
            for (String fileName : tabsFiles) {
                InstrumentationRegistry.getTargetContext().deleteFile(fileName);
            }
            /o  TODO: Fix deleting of tabs files. Faster than closing all tabs in Tear Down. */
        }
        catch (Exception e) {
            Log.e("AUTOBOTS", e.getMessage());
        }
    }

    @Test
    public void focusedSearchBar() throws Throwable {
        Thread.sleep(2000);
        onView(allOf(hasFocus(), withId(R.id.search_edit_text))).check(matches(isDisplayed()));

    }

    @Test
    public void numberOfInitialTabs() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        onView(withId(R.id.open_tabs_count)).check(matches(withText("1")));
    }

    @Test
    public void changeOfNumberOfTabs() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.new_tab_menu_button)).perform(click());
        onView(withId(R.id.open_tabs_count)).check(matches(withText("2")));
    }

    @Test
    public void viewAllTabs() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
    }

    @Test
    public void overViewTabs() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withId(R.id.new_tab_button)).perform(click());
        onView(withId(R.id.open_tabs_count)).check(matches(withText("2")));
    }

    @Test
    public void threeDotMenu() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        ViewHelpers.onView(withId(R.id.overflow_menu)).customCheck(matches(isDisplayed()), 400);
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(clickXY(120, 640));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(pressBack());
    }

    @Test
    public void forwardButton() {
        onView(withId(R.id.search_edit_text)).
                perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/forward_test.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("testlink")));
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.ID, "testlink")).perform(webClick());
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.CSS_SELECTOR, "p "))
                .check(webMatches(getText(), containsString("A simple webpage")));
        onView(withId(R.id.overflow_menu)).perform(pressBack());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("testlink")));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.action_forward)).perform(click());
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.CSS_SELECTOR, "p "))
                .check(webMatches(getText(), containsString("A simple webpage")));
    }

    @Test
    public void testCloseTab() throws InterruptedException {
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("datetime")));
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withId(R.id.regular_tab_id)).perform(swipeLeft());
        Thread.sleep(1000);
        ViewHelpers.onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        ViewHelpers.onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.urlTv)).check(matches(withText("New Tab")));
    }

    @Test
    public void testForgetTab() {
        onView(withId(R.id.search_edit_text)).
                perform(new ClickDrawableAction(ClickDrawableAction.Left));
        onView(withId(R.id.menu_overview)).check(matches(isDisplayed()));
        onView(withId(R.id.overflow_menu)).check(matches(isDisplayed())).perform(click());
        onView(withId(R.id.new_incognito_tab_menu_button)).perform(click());
        onView(withId(R.id.incognito_title)).check(matches(isDisplayed()));
        onView(withId(R.id.incognito_desc)).check(matches(isDisplayed()));
    }
}
