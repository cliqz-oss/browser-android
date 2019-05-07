package com.cliqz.browser.main;

import android.content.Context;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import com.cliqz.browser.widget.AutocompleteEditText;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

public class QuickAccessBar extends FrameLayout {

    @Inject
    Bus bus;

    public QuickAccessBar(@NonNull Context context) {
        this(context, null);
    }

    public QuickAccessBar(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public QuickAccessBar(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    public void setSearchTextView(AutocompleteEditText searchEditText) {

    }

    public void hide() {

    }

    public void show() {

    }

    public void showSuggestions(String[] suggestions, String query) {

    }
}
