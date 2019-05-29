package com.cliqz.browser.test;

import android.app.Activity;
import androidx.test.espresso.Espresso;
import androidx.test.espresso.intent.rule.IntentsTestRule;

/**
 * @author Kiiza Joseph Bazaare
 */
public class CustomHandlerIntentTestRule<T extends Activity> extends IntentsTestRule<T> {

    public CustomHandlerIntentTestRule(Class<T> activityClass) {
        super(activityClass);
    }

    @Override
    protected void afterActivityLaunched() {
        Espresso.setFailureHandler(new CustomFailureHandler(getActivity()));
        super.afterActivityLaunched();
    }


}
