package com.cliqz.browser.test;

import android.text.SpannableString;
import android.text.style.ClickableSpan;
import android.view.View;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.test.espresso.UiController;
import androidx.test.espresso.ViewAction;

import org.hamcrest.Matcher;
import org.hamcrest.Matchers;

@SuppressWarnings("WeakerAccess")
public final class ViewActions {

    private ViewActions() {}

    @NonNull
    public static ViewAction clickOnSpanText(@NonNull String text) {
        return new ClickOnSpanText(text);
    }

    private static class ClickOnSpanText implements ViewAction {

        private final String text;

        ClickOnSpanText(@NonNull String text) {
            this.text = text;
        }

        @Override
        public Matcher<View> getConstraints() {
            return Matchers.instanceOf(TextView.class);
        }

        @Override
        public String getDescription() {
            return String.format("clicking the span \"%s\"", text);
        }

        @Override
        public void perform(UiController uiController, View view) {
            final TextView textView = (TextView) view;
            final SpannableString spannable = (SpannableString) textView.getText();
            final ClickableSpan[] spans =
                    spannable.getSpans(0, spannable.length(), ClickableSpan.class);
            for (ClickableSpan span: spans) {
                final int start = spannable.getSpanStart(span);
                final int end = spannable.getSpanEnd(span);
                final String spanText = spannable.subSequence(start, end).toString();
                if (text.equals(spanText)) {
                    span.onClick(view);
                    break;
                }
            }
        }
    }
}
