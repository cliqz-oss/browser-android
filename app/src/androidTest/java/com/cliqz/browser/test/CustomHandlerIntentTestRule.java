package com.cliqz.browser.test;

import android.app.Activity;
import android.support.test.espresso.Espresso;
import android.support.test.espresso.intent.rule.IntentsTestRule;

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
