package com.cliqz.browser.test;

import android.content.Context;
import android.util.Log;
import android.view.KeyEvent;

import androidx.test.InstrumentationRegistry;
import androidx.test.espresso.Espresso;
import androidx.test.espresso.web.assertion.WebViewAssertions;
import androidx.test.espresso.web.matcher.DomMatchers;
import androidx.test.espresso.web.webdriver.Locator;
import androidx.test.rule.ActivityTestRule;
import androidx.test.runner.AndroidJUnit4;

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

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.pressBack;
import static androidx.test.espresso.action.ViewActions.pressKey;
import static androidx.test.espresso.action.ViewActions.swipeLeft;
import static androidx.test.espresso.action.ViewActions.typeText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isChecked;
import static androidx.test.espresso.matcher.ViewMatchers.isClickable;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.isEnabled;
import static androidx.test.espresso.matcher.ViewMatchers.withClassName;
import static androidx.test.espresso.matcher.ViewMatchers.withContentDescription;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static androidx.test.espresso.web.assertion.WebViewAssertions.webMatches;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.findElement;
import static androidx.test.espresso.web.webdriver.DriverAtoms.getText;
import static androidx.test.espresso.web.webdriver.DriverAtoms.webClick;
import static com.cliqz.browser.utils.ViewHelpers.clickXY;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.equalToIgnoringCase;
import static org.hamcrest.Matchers.not;
import static com.cliqz.browser.test.Matchers.withProperty;

/**
 * @author Kiiza Joseph Bazaare
 * @author Sharath Ganesh Pai
 */

@RunWith(AndroidJUnit4.class)
public class MainActivityTest {

    @Rule
    public TestName testName = new TestName();

    private static Process recorder;

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
        onView(withContentDescription("More options")).perform(click());
        onView(withText("Close All Tabs")).perform(click());
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
            Log.e("EspressoTests", e.getMessage());
        }
    }

    @Test
    public void numberOfInitialTabs() {
        onView(withId(R.id.open_tabs_count)).check(matches(withProperty("counter", 1)));
    }

    // @Test
    public void actionableButtons() {
        ViewHelpers.onView(withId(R.id.overflow_menu)).customCheck(matches(isDisplayed()), 400);
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(allOf(isEnabled(), withId(R.id.action_share))).check(matches(isDisplayed()));
        onView(allOf(not(isEnabled()), withId(R.id.action_refresh))).check(matches(isDisplayed()));
        onView(allOf(not(isEnabled()), withId(R.id.action_forward))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.new_tab_menu_button))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.new_incognito_tab_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(not(isClickable()), withId(R.id.search_on_page_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(not(isClickable()), withId(R.id.add_to_favourites_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.settings_menu_button))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.request_desktop_site))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.quit_menu_button))).check(matches(isDisplayed()));

    }

    @Test
    public void changeOfNumberOfTabs() {
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.new_tab_menu_button)).perform(click());
        onView(withId(R.id.open_tabs_count)).check(matches(withProperty("counter", 2)));
    }

    @Test
    public void viewAllTabs() {
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
    }

    @Test
    public void overViewTabs() {
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withId(R.id.new_tab_button)).perform(click());
        onView(withId(R.id.open_tabs_count)).check(matches(withProperty("counter", 2)));
    }

    @Test
    public void threeDotMenu() {
        ViewHelpers.onView(withId(R.id.overflow_menu)).customCheck(matches(isDisplayed()), 400);
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(clickXY(120, 640));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(pressBack());
    }

    /*  Disabled as this Test is broken. o/
    @Test
    public void actionableButtonsWebPage() {
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("datetime")));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(allOf(isEnabled(), withId(R.id.action_share))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.action_refresh))).check(matches(isDisplayed()));
        onView(allOf(IsNot.not(isEnabled()), withId(R.id.action_forward)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.new_tab_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.new_incognito_tab_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.search_on_page_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.add_to_favourites_menu_button)))
                .check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.settings_menu_button))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.request_desktop_site))).check(matches(isDisplayed()));
        onView(allOf(isEnabled(), withId(R.id.quit_menu_button))).check(matches(isDisplayed()));
    }
    /o TODO: Fix this test. */

    @Test
    public void freshTabVisible() {
        onView(withId(R.id.topsites_grid)).check(matches(isDisplayed()));
        onView(withId(R.id.topnews_list)).check(matches(isDisplayed()));
    }

    @Test
    public void favoritesTabAndAddDelFavorites() {
        mActivityRule.getActivity().getHistoryDatabase().clearHistory(true);
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withText(equalToIgnoringCase("FAVORITES"))).perform(click());
        onView(withId(R.id.ll_no_favorite)).check(matches(isDisplayed()));
        onView(withId(R.id.toolbar)).perform(pressBack());
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("datetime")));
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.toggle_favorite)).perform(click());
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.toggle_favorite)).check(matches(isChecked()));
        Espresso.pressBack();
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withText(equalToIgnoringCase("FAVORITES"))).perform(click());
        onView(withId(R.id.favorites_view_parent)).perform(swipeLeft());
        onView(withText(equalToIgnoringCase("OPEN TABS"))).perform(click());
        onView(withId(R.id.toolbar)).perform(pressBack());
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.toggle_favorite)).check(matches(not(isChecked()))).perform(pressBack());
    }

    @Test
    public void forwardButton() {
        onView(withId(R.id.title_bar)).perform(click());
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
    public void testControlCenterVisible() {
        onView(withId(R.id.topsites_grid)).check(matches(isDisplayed()));
        onView(allOf(withId(R.id.control_center))).check(matches(not(isDisplayed())));
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("datetime")));
        onView(allOf(withId(R.id.control_center))).check(matches(isDisplayed()));
    }

    @Test
    public void testCloseTab() throws InterruptedException {
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webContent(DomMatchers.hasElementWithId("datetime")));
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withId(R.id.regular_tab_id)).perform(swipeLeft());
        Thread.sleep(1000);
        ViewHelpers.onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.urlTv)).check(matches(withText("New Tab")));
    }

    @Test
    public void testForgetTab() {
        onView(withId(R.id.menu_overview)).check(matches(isDisplayed()));
        onView(withId(R.id.overflow_menu)).check(matches(isDisplayed())).perform(click());
        onView(withId(R.id.new_incognito_tab_menu_button)).perform(click());
        onView(withId(R.id.incognito_title)).check(matches(isDisplayed()));
        onView(withId(R.id.incognito_desc)).check(matches(isDisplayed()));
    }
}
