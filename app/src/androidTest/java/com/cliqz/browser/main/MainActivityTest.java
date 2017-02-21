package com.cliqz.browser.main;

import android.support.test.espresso.ViewAction;
import android.support.test.espresso.action.CoordinatesProvider;
import android.support.test.espresso.action.GeneralClickAction;
import android.support.test.espresso.action.Press;
import android.support.test.espresso.action.Tap;
import android.support.test.espresso.web.webdriver.Locator;
import android.support.test.rule.ActivityTestRule;
import android.support.test.runner.AndroidJUnit4;
import android.test.suitebuilder.annotation.LargeTest;
import android.view.KeyEvent;
import android.view.View;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.FavoritesWebView;
import com.cliqz.browser.webview.SearchWebView;
import com.cliqz.browser.widget.OverFlowMenu;

import org.hamcrest.core.IsNot;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import acr.browser.lightning.view.CliqzWebView;

import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.action.ViewActions.pressBack;
import static android.support.test.espresso.action.ViewActions.pressKey;
import static android.support.test.espresso.action.ViewActions.typeText;
import static android.support.test.espresso.assertion.ViewAssertions.matches;
import static android.support.test.espresso.matcher.ViewMatchers.hasFocus;
import static android.support.test.espresso.matcher.ViewMatchers.isClickable;
import static android.support.test.espresso.matcher.ViewMatchers.isDisplayed;
import static android.support.test.espresso.matcher.ViewMatchers.isEnabled;
import static android.support.test.espresso.matcher.ViewMatchers.withClassName;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static android.support.test.espresso.matcher.ViewMatchers.withText;
import static android.support.test.espresso.web.assertion.WebViewAssertions.webMatches;
import static android.support.test.espresso.web.sugar.Web.onWebView;
import static android.support.test.espresso.web.webdriver.DriverAtoms.findElement;
import static android.support.test.espresso.web.webdriver.DriverAtoms.getText;
import static android.support.test.espresso.web.webdriver.DriverAtoms.webClick;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.equalToIgnoringCase;
import static org.hamcrest.Matchers.not;

/**
 * Created by Ravjit on 21/12/15.
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class MainActivityTest {

    @Rule
    public ActivityTestRule<MainActivity>
            mActivityRule = new ActivityTestRule<>(MainActivity.class);

    @Test
    public void focusedSearchBar() {
        onView(allOf(hasFocus(), withId(R.id.search_edit_text))).check(matches(isDisplayed()));

    }

    @Test
    public void numberOfInitialTabs() {
        onView(withId(R.id.open_tabs_count)).check(matches(withText("1")));
    }

    @Test
    public void actionableButtons() {
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
        onView(withId(R.id.open_tabs_count)).check(matches(withText("2")));
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

        onView(withId(R.id.page_domain)).check(matches(withText("New Tab")));

        onView(withId(R.id.new_tab_button)).perform(click());
        onView(withId(R.id.open_tabs_count)).check(matches(withText("2")));

    }

    @Test
    public void threeDotMenu() {
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(clickXY(120, 640));

        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).check(matches(isDisplayed()));
        onView(withClassName(equalTo(OverFlowMenu.class.getName()))).perform(pressBack());

    }

    public static ViewAction clickXY(final int x, final int y) {
        return new GeneralClickAction(
                Tap.SINGLE,
                new CoordinatesProvider() {
                    @Override
                    public float[] calculateCoordinates(View view) {

                        final int[] screenPos = new int[2];
                        view.getLocationOnScreen(screenPos);

                        final float screenX = screenPos[0] + x;
                        final float screenY = screenPos[1] + y;
                        float[] coordinates = {screenX, screenY};

                        return coordinates;
                    }
                },
                Press.FINGER);
    }

    @Test
    public void actionableButtonsWebPage() throws Throwable {
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        Thread.sleep(3000);
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.ID, "datetime"));
        Thread.sleep(3000);
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

    @Test
    public void freshTabVisible() {
        onWebView(withId(R.id.search_web_view)).withElement(findElement(Locator.ID, "topSites"));
        onWebView(withClassName(equalTo(SearchWebView.class.getName())))
                .withElement(findElement(Locator.ID, "topNews"));
    }

//    @Test
//    public void historyTab() throws Throwable {
//        mActivityRule.getActivity().historyDatabase.clearHistory(true);
//        mActivityRule.getActivity().historyDatabase.clearHistory(false);
//        onView(withId(R.id.menu_overview)).perform(click());
//        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
//        onView(withText(equalToIgnoringCase("HISTORY"))).perform(click());
//        Thread.sleep(10000);
//        onWebView(withClassName(equalTo(HistoryWebView.class.getName())))
//                .withElement(findElement(Locator.CLASS_NAME, "nohistoryyet"));
//        Thread.sleep(2000);
//        onView(withId(R.id.toolbar)).perform(pressBack());
//        onView(withId(R.id.search_edit_text))
//                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
//                        pressKey(KeyEvent.KEYCODE_ENTER));
//        Thread.sleep(5000);
//        onView(withId(R.id.menu_overview)).perform(click());
//        onView(withText(equalToIgnoringCase("HISTORY"))).perform(click());
//        Thread.sleep(2000);
//        onWebView(withClassName(equalTo(HistoryWebView.class.getName())))
//                .withElement(findElement(
//                        Locator.CSS_SELECTOR, ".content.history .question .item .item__head"));
//        onWebView(withClassName(equalTo(HistoryWebView.class.getName())))
//                .withElement(findElement(
//                        Locator.CSS_SELECTOR, ".content.history .answer .item .item__head"));
//    }

    @Test
    public void favoritesTab() throws Throwable {
        mActivityRule.getActivity().historyDatabase.clearHistory(true);
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withText(equalToIgnoringCase("FAVORITES"))).perform(click());
        Thread.sleep(10000);
        onWebView(withClassName(equalTo(FavoritesWebView.class.getName())))
                .withElement(findElement(Locator.CLASS_NAME, "nohistoryyet"));
        Thread.sleep(5000);
        onView(withId(R.id.toolbar)).perform(pressBack());
        onView(withId(R.id.search_edit_text))
                .perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/testpage.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        Thread.sleep(5000);
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.add_to_favourites_menu_button)).perform(click());
        Thread.sleep(5000);
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withText(equalToIgnoringCase("FAVORITES"))).perform(click());
        Thread.sleep(10000);
        onWebView(withClassName(equalTo(FavoritesWebView.class.getName()))).
                withElement(findElement(Locator.CLASS_NAME, "item__head"));

    }

    @Test
    public void forwardButton() throws Throwable {
        onView(withId(R.id.search_edit_text)).
                perform(typeText("https://cdn.cliqz.com/mobile/browser/tests/forward_test.html"),
                        pressKey(KeyEvent.KEYCODE_ENTER));
        Thread.sleep(3000);
        onView(withId(R.id.menu_overview)).check(matches(isDisplayed()));
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.ID, "testlink")).perform(webClick());
        Thread.sleep(3000);
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.CSS_SELECTOR, "p "))
                .check(webMatches(getText(), containsString("A simple webpage")));
        Thread.sleep(3000);
        onView(withId(R.id.overflow_menu)).perform(pressBack());
        Thread.sleep(3000);
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.ID, "testlink"));
        Thread.sleep(3000);
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.action_forward)).perform(click());
        Thread.sleep(3000);
        onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withElement(findElement(Locator.CSS_SELECTOR, "p "))
                .check(webMatches(getText(), containsString("A simple webpage")));
        Thread.sleep(3000);
    }
    /*
    Last Test on Android for Delete Favorites
    @Test
    public void deleteFavorite() throws Throwable {
        onView(withId(R.id.menu_overview)).perform(click());
        onView(withId(R.id.tabs_list_view)).check(matches(isDisplayed()));
        onView(withText(equalToIgnoringCase("FAVORITES"))).perform(click());
        Thread.sleep(10000);
        onWebView(withClassName(equalTo(FavoritesWebView.class.getName())))
                .withElement(findElement(Locator.CSS_SELECTOR, "li.cf.answer "))
                .perform(DriverAtoms.webClick());
        Thread.sleep(5000);
    }*/

}





