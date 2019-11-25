package com.cliqz.browser.test;

import android.view.View;

import androidx.annotation.NonNull;
import androidx.test.espresso.ViewAssertion;
import androidx.test.espresso.matcher.ViewMatchers;

import org.hamcrest.BaseMatcher;
import org.hamcrest.Description;
import org.hamcrest.Matcher;

import java.lang.reflect.Method;

import static androidx.test.espresso.assertion.ViewAssertions.matches;

/**
 * A collections of customized matchers for Views
 */
@SuppressWarnings("WeakerAccess")
public class Matchers {
    private Matchers() {} // No instances

    /**
     * A matcher matching a view if a property (getter) has a specific value
     *
     * @param propertyName the property to be checked
     * @param value the expected property value
     * @return true if a getter for the property exists and has the expected value, false otherwise
     */
    @NonNull
    public static Matcher<View> withProperty(@NonNull String propertyName, @NonNull Object value) {
        return new PropertyMatcher(propertyName, value);
    }

    public static ViewAssertion isGone() {
        return matches(ViewMatchers.withEffectiveVisibility(ViewMatchers.Visibility.GONE));
    }

    /**
     * It matches a property value (getter) using reflection
     */
    private static class PropertyMatcher extends BaseMatcher<View> {
        private final String propertyName;
        private final Object value;

        private PropertyMatcher(@NonNull String propertyName, @NonNull Object value) {
            this.propertyName = propertyName;
            this.value = value;
        }

        @Override
        public boolean matches(Object item) {
            final Class clazz = item.getClass();
            final String getterName = getterName();
            try {
                @SuppressWarnings("unchecked")
                final Method getter = clazz.getDeclaredMethod(getterName);
                final Object result = getter.invoke(item);
                return value.equals(result);
            } catch (Exception e) {
                return false;
            }
        }

        @Override
        public void describeTo(Description description) {
            description.appendText("item.")
                    .appendText(getterName())
                    .appendText("() == ")
                    .appendText(value.toString());
        }

        private String getterName() {
            return "get" + propertyName.substring(0, 1).toUpperCase() + propertyName.substring(1);
        }
    }
}
