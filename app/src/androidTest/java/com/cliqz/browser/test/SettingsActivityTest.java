package com.cliqz.browser.test;

import android.support.test.espresso.intent.rule.IntentsTestRule;
import android.support.test.filters.LargeTest;
import android.support.test.runner.AndroidJUnit4;

import com.cliqz.browser.R;
import com.cliqz.browser.main.MainActivity;

import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import acr.browser.lightning.activity.SettingsActivity;

import static android.support.test.espresso.Espresso.onView;
import static android.support.test.espresso.action.ViewActions.click;
import static android.support.test.espresso.intent.Intents.intended;
import static android.support.test.espresso.intent.matcher.ComponentNameMatchers.hasClassName;
import static android.support.test.espresso.intent.matcher.ComponentNameMatchers.hasMyPackageName;
import static android.support.test.espresso.intent.matcher.IntentMatchers.hasComponent;
import static android.support.test.espresso.matcher.ViewMatchers.withId;
import static org.hamcrest.Matchers.allOf;

/**
 * Created by kiizajosephbazaare on 11/22/16.
 */
@RunWith(AndroidJUnit4.class)
@LargeTest
public class SettingsActivityTest {
    @Rule
    public IntentsTestRule<MainActivity> mIntentRule = new IntentsTestRule<>(MainActivity.class);

    @Test
    public void viewSettings(){
        onView(withId(R.id.overflow_menu)).perform(click());
        onView(withId(R.id.settings_menu_button)).perform(click());
        intended(hasComponent(allOf(hasClassName(SettingsActivity.class.getName()), hasMyPackageName())));
    }
}
