package com.cliqz.browser.utils;

import android.view.View;

import androidx.test.espresso.web.assertion.WebAssertion;
import androidx.test.espresso.web.sugar.Web;
import androidx.test.espresso.web.sugar.Web.WebInteraction;

import org.hamcrest.Matcher;

import java.util.concurrent.TimeUnit;

import timber.log.Timber;

/**
 * This class helps to perform an assertion on a webView while waiting for the web view to be loaded
 *
 * @author Stefano Pacifici
 */
public class WebHelpers {

    private WebHelpers() {
        // No Instances
    }

    public static WebInteractionWrapper<Void> onWebView(Matcher<View> matcher) {
        return new WebInteractionWrapper<>(Web.onWebView(matcher));
    }

    public static class WebInteractionWrapper<T> {

        private final WebInteraction<T> webInteraction;
        private long mTimeout = 10000l; // 10 seconds

        private WebInteractionWrapper(WebInteraction<T> interaction) {
            this.webInteraction = interaction;
        }
        /**
         * @return A web interaction that performs an assertion on a webView
         * with a time delay until the webView is loaded or the timeout is
         * triggered.
         */
        public <E> WebInteractionWrapper<E> check(WebAssertion<E> assertion) {
            WebInteraction<E> interaction;
            final long timeout = System.currentTimeMillis() + mTimeout;
            while (true) {
                try {
                    Timber.d("Performing " + assertion.toString());
                    interaction = webInteraction.check(assertion);
                    break;
                } catch (Throwable t) {
                    Timber.d(t, "Throwable caught");
                    final long now = System.currentTimeMillis();
                    if (now >= timeout) {
                        throw t;
                    }
                    sleepTight();
                }
            }

            return new WebInteractionWrapper<E>(interaction);
        }

        /**
         * Change the timeout value for this wrapper (default: 10 seconds)
         *
         * @param timeout timeout value
         * @param timeUnit timeout time unit
         * @return  a {@link WebInteractionWrapper}
         */
        public WebInteractionWrapper<T> withTimeout(long timeout, TimeUnit timeUnit) {
            mTimeout = TimeUnit.MILLISECONDS.convert(timeout, timeUnit);
            return this;
        }
    }

    // Performs a time delay.
    private static void sleepTight() {
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

}
