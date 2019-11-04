package com.cliqz.browser.main;

import android.Manifest;
import android.util.Log;
import android.view.KeyEvent;

import androidx.test.espresso.Espresso;
import androidx.test.espresso.web.assertion.WebViewAssertions;
import androidx.test.filters.LargeTest;
import androidx.test.rule.ActivityTestRule;
import androidx.test.rule.GrantPermissionRule;
import androidx.test.runner.AndroidJUnit4;

import com.cliqz.browser.R;
import com.cliqz.browser.test.ClearPreferencesRule;
import com.cliqz.browser.test.ClearTabsDataRule;
import com.cliqz.browser.test.CustomFailureHandler;
import com.cliqz.browser.test.DeviceShellHelper;
import com.cliqz.browser.utils.ViewHelpers;
import com.cliqz.browser.utils.WebHelpers;

import org.junit.After;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.RuleChain;
import org.junit.rules.TestName;
import org.junit.rules.TestRule;
import org.junit.runner.RunWith;

import java.util.Random;
import java.util.concurrent.TimeUnit;

import acr.browser.lightning.view.CliqzWebView;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.action.ViewActions.pressBack;
import static androidx.test.espresso.action.ViewActions.pressKey;
import static androidx.test.espresso.action.ViewActions.swipeUp;
import static androidx.test.espresso.action.ViewActions.typeText;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isChecked;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withClassName;
import static androidx.test.espresso.matcher.ViewMatchers.withId;
import static androidx.test.espresso.matcher.ViewMatchers.withResourceName;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static androidx.test.espresso.web.model.Atoms.getCurrentUrl;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.equalToIgnoringCase;

/**
 * @author Kiiza Joseph Bazaare
 * @author Sharath Ganesh Pai
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class SettingsActivityTest {

    private TestName testName = new TestName();

    private GrantPermissionRule grantPermissionRule = GrantPermissionRule.grant(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.WRITE_EXTERNAL_STORAGE);

    private ActivityTestRule<MainActivity> mActivityRule =
            new ActivityTestRule<>(MainActivity.class, false, false);

    @Rule
    public TestRule rule = RuleChain
            .outerRule(testName)
            .around(grantPermissionRule)
            .around(new ClearTabsDataRule())
            .around(new ClearPreferencesRule())
            .around(mActivityRule);

    @BeforeClass
    public static void allowLocationAccess() {
        System.setProperty("ALLOW_LOCATION", "true");
    }

    @Before
    public void setUp() {
        Log.d("AUTOBOTS", testName.getMethodName());
        Espresso.setFailureHandler(new CustomFailureHandler(mActivityRule.launchActivity(null)));
        mActivityRule.getActivity().goToSettings(new Messages.GoToSettings());
    }

    @After
    public void tearDown() {
        DeviceShellHelper.takeScreenshot(testName.getMethodName());
    }

    @Test
    public void viewSettings() {
        onView(withText("FAQs & Support")).check(matches(isDisplayed()));
        onView(withText("Privacy")).check(matches(isDisplayed()));
        onView(withText("General")).check(matches(isDisplayed()));
        onView(withText("Human Web")).check(matches(isDisplayed()));
    }

    public void setAndConfirmSearchEngine(final String engine, final String url) {
        String query = randomStringGenerator();
        onView(withId(R.id.action_bar_root)).check(matches(isDisplayed()));
        onView(withText(equalToIgnoringCase("General"))).check(matches(isDisplayed()))
                .perform(click());
        onView(withText(equalToIgnoringCase("Complementary search engine"))).perform(click());
        onView(withText(equalToIgnoringCase(engine))).perform(click());
        onView(withText(equalToIgnoringCase("OK"))).perform(click());
        onView(withText(equalToIgnoringCase("Search results for"))).perform(pressBack());
        onView(withText(equalToIgnoringCase("Settings"))).perform(pressBack());
        onView(withId(R.id.title_bar)).perform(click());
        onView(withId(R.id.search_edit_text)).perform(typeText(query),
                pressKey(KeyEvent.KEYCODE_ENTER));
        try {
            WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                    .withTimeout(10, TimeUnit.SECONDS)
                    .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString(url)));
            ViewHelpers.onView(withId(R.id.title_bar)).perform(click());
            onView(withId(R.id.search_edit_text)).check(matches(withText(containsString(query))))
                    .check(matches(withText(containsString(url))));
        } catch(Exception e) {
            mActivityRule.finishActivity();
            mActivityRule.launchActivity(null);
            try {
                ViewHelpers.onView(withId(R.id.title_bar)).perform(click());
            } catch (Exception ex) {
                Log.e("AUTOBOTS", ex.toString());
            }
            onView(withId(R.id.title_bar)).perform(click());
            onView(withId(R.id.search_edit_text)).check(matches(withText(containsString(query))))
                    .check(matches(withText(containsString(url))));
        }
    }

    public String randomStringGenerator() {
        int leftLimit = 97;
        int rightLimit = 122;
        int targetStringLength = 10;
        Random random = new Random();
        StringBuilder buffer = new StringBuilder(targetStringLength);
        for (int i = 0; i < targetStringLength; i++) {
            int randomLimitedInt = leftLimit + (int)
                    (random.nextFloat() * (rightLimit - leftLimit + 1));
            buffer.append((char) randomLimitedInt);
        }
        return buffer.toString();
    }

    @Test
    public void changeComplementarySearchEngineToBing() {
        setAndConfirmSearchEngine("Bing","https://www.bing.com");
    }

    /* Disabling Test due to https://consent.yahoo.com o/
    @Test
    public void changeComplementarySearchEngineToYahoo() {
        setAndConfirmSearchEngine("Yahoo", "yahoo.com");
    }
    /o TODO: Fix this test */

    @Test
    public void changeComplementarySearchEngineToDuckDuckGo() {
        setAndConfirmSearchEngine("DuckDuckGo", "https://duckduckgo.com");
    }

    @Test
    public void changeComplementarySearchEngineToEcosia() {
        setAndConfirmSearchEngine("Ecosia", "https://www.ecosia.org");
    }

    @Test
    public void changeComplementarySearchEngineToStartPage() {
        setAndConfirmSearchEngine("StartPage", "startpage.com");
    }

    @Test
    public void changeComplementarySearchEngineToGoogle() {
        setAndConfirmSearchEngine("Google", "https://www.google.");
    }

    @Test
    public void changeComplementarySearchEngineCheckMark() {
        onView(withId(R.id.action_bar_root)).check(matches(isDisplayed()));
        onView(withText(equalToIgnoringCase("General"))).check(matches(isDisplayed()))
                .perform(click());
        onView(withText(equalToIgnoringCase("Complementary search engine"))).perform(click());
        onView(withText(equalToIgnoringCase("Bing"))).perform(click())
                .check(matches(isChecked()));
        onView(withText(equalToIgnoringCase("Yahoo"))).perform(click())
                .check(matches(isChecked()));
        onView(withText(equalToIgnoringCase("DuckDuckGo"))).perform(click())
                .check(matches(isChecked()));
        onView(withText(equalToIgnoringCase("Ecosia"))).perform(click())
                .check(matches(isChecked()));
        onView(withText(equalToIgnoringCase("StartPage"))).perform(click())
                .check(matches(isChecked()));
        onView(withText(equalToIgnoringCase("Google"))).perform(click())
                .check(matches(isChecked()));
    }

    @Test
    public void viewGeneralSettings() {
        onView(withText("General")).perform(click());
        onView(withText("Search results for")).check(matches(isDisplayed()));
        onView(withText("Block explicit content")).check(matches(isDisplayed()));
        onView(withText("Enable Autocompletion")).check(matches(isDisplayed()));
        onView(withText("Show background image")).check(matches(isDisplayed()));
        onView(withText("Show most visited websites")).check(matches(isDisplayed()));
        onView(withText("Show News")).check(matches(isDisplayed()));
        onView(withResourceName("prefs")).perform(swipeUp());
        onView(withText("Show MyOffrz")).check(matches(isDisplayed()));
        onView(withText("News notifications")).check(matches(isDisplayed()));
        onView(withText("Reset all subscriptions")).check(matches(isDisplayed()));
    }

    @Test
    public void viewPrivacySettings() {
        onView(withText("Privacy")).perform(click());
        onView(withText("Anti-Tracking")).check(matches(isDisplayed()));
        onView(withText("Enable cookies")).check(matches(isDisplayed()));
        onView(withText("Automatic Forget Tab")).check(matches(isDisplayed()));
        // onView(withText("Location permissions")).check(matches(isDisplayed()));
        onView(withText("Save your passwords")).check(matches(isDisplayed()));
        onView(withText("Restore most visited websites")).check(matches(isDisplayed()));
        onView(withResourceName("prefs")).perform(swipeUp());
        onView(withText("Clear private data")).check(matches(isDisplayed()));
        onView(withText("Clear favorites")).check(matches(isDisplayed()));
        onView(withText("Clear private data on exit")).check(matches(isDisplayed()));
        onView(withText("Send usage data")).check(matches(isDisplayed()));
    }

    @Test
    public void viewHumanWebSettings() {
        onView(withText("Human Web")).perform(click());
        onView(withText("What is Human Web?")).check(matches(isDisplayed()));
        onView(withText("Enable Human Web")).check(matches(isDisplayed()));
    }

    @Test
    public void viewBlockAdsSettings() {
        onView(withText("Block Ads (Beta)")).perform(click());
        onView(withText("Block Ads")).check(matches(isDisplayed()));
        onView(withText("Fair Blocking")).check(matches(isDisplayed()));
        onView(withText("What is 'fair'?")).check(matches(isDisplayed()));
    }

    @Test
    public void viewAboutSettings() {
        onView(withText("About")).perform(click());
        onView(withText("Application Version")).check(matches(isDisplayed()));
        onView(withText("Extension Version")).check(matches(isDisplayed()));
    }

    @Test
    public void viewRateCliqzBrowserSettings() {
        onView(withText("Rate Cliqz Browser")).check(matches(isDisplayed()));
    }

    @Test
    public void viewReportWebsiteSettings() {
        ViewHelpers.onView(withText("Report Website")).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withTimeout(1, TimeUnit.MINUTES)
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("report-url")));
        onView(withId(R.id.title_bar)).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("report-url")));
    }

    @Test
    public void viewImprintSettings() {
        ViewHelpers.onView(withText("Imprint")).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withTimeout(1, TimeUnit.MINUTES)
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("legal")));
        onView(withId(R.id.title_bar)).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("legal")));
    }

    @Test
        public void viewTipsAndTricksSettings() {
        ViewHelpers.onView(withText("Get the best out of Cliqz")).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withTimeout(1, TimeUnit.MINUTES)
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("tips-android")));
        onView(withId(R.id.title_bar)).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webMatches(getCurrentUrl(),containsString("tips-android")));
    }

    @Test
    public void viewSupportSettings() {
        onView(withText("Imprint")).perform(swipeUp());
        ViewHelpers.onView(withText("FAQs & Support")).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .withTimeout(1, TimeUnit.MINUTES)
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("support")));
        onView(withId(R.id.title_bar)).perform(click());
        WebHelpers.onWebView(withClassName(equalTo(CliqzWebView.class.getName())))
                .check(WebViewAssertions.webMatches(getCurrentUrl(), containsString("support")));
    }
}
