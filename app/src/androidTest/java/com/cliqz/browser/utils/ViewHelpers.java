package com.cliqz.browser.utils;

import android.support.test.espresso.Espresso;
import android.support.test.espresso.ViewAction;
import android.support.test.espresso.ViewAssertion;
import android.support.test.espresso.ViewInteraction;
import android.support.test.espresso.action.CoordinatesProvider;
import android.support.test.espresso.action.GeneralClickAction;
import android.support.test.espresso.action.Press;
import android.support.test.espresso.action.Tap;
import android.util.Log;
import android.view.View;

import com.cliqz.browser.R;

import org.hamcrest.Matcher;

import static android.support.test.espresso.matcher.ViewMatchers.withId;

/**
 * @author Ravjit
 */
public class ViewHelpers {

    private final static String TAG = WebHelpers.class.getSimpleName();

    private ViewHelpers() {
        // No Instances
    }

    public static ViewInteractionWrapper onView(Matcher<View> matcher) {
        return new ViewInteractionWrapper(Espresso.onView(matcher));
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

                        return new float[]{screenX, screenY};
                    }
                },
                Press.FINGER);
    }

    public static class ViewInteractionWrapper {

        private final ViewInteraction viewInteraction;

        private ViewInteractionWrapper(ViewInteraction interaction) {
            this.viewInteraction = interaction;

        }
        /**
         * @return A view interaction that performs an assertion on a View
         * with a time delay until the View is loaded or the timeout is
         * triggered.
         */
        public ViewInteractionWrapper perform(final ViewAction... viewActions) {
            ViewInteraction interaction = null;
            final long timeout = System.currentTimeMillis() + 10000;
            for (ViewAction viewAction : viewActions) {
                while (true) {
                    try {
                        Log.d(TAG, "Performing " + viewAction.toString());
                        interaction = viewInteraction.perform(viewAction);
                        break;
                    } catch (Throwable t) {
                        Log.d(TAG, "Throwable caught", t);
                        final long now = System.currentTimeMillis();
                        if (now >= timeout) {
                            throw t;
                        }
                        sleepTight();
                    }
                }
            }

            return new ViewInteractionWrapper(interaction);
        }

        public ViewInteractionWrapper customCheck(ViewAssertion assertion, int yCord) {
            ViewInteraction interaction;
            final long timeout = System.currentTimeMillis() + 10000;
            while (true) {
                try {
                    Log.d(TAG, "Performing " + assertion.toString());
                    interaction = viewInteraction.check(assertion);
                    break;
                } catch (Throwable t) {
                    Log.d(TAG, "Throwable caught", t);
                    final long now = System.currentTimeMillis();
                    if (now >= timeout) {
                        throw t;
                    }
                    sleepTight();
                    onView(withId(R.id.search_edit_text)).perform(clickXY(1,yCord));
                }
            }
            return new ViewInteractionWrapper(interaction);
        }

    }
    /**
     * @sleepTight Performs a time delay.
     * */
    private static void sleepTight() {
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }
}