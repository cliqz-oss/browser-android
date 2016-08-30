package com.cliqz.browser.widget;

import android.content.Context;
import android.graphics.drawable.Drawable;
import android.support.v4.content.ContextCompat;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import com.cliqz.browser.R;

import acr.browser.lightning.utils.ThemeUtils;
import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * Created by Ravjit on 07/12/15.
 */
public class SearchBar extends FrameLayout {

    @Bind(R.id.search_edit_text)
    AutocompleteEditText searchEditText;

    @Bind(R.id.title_bar)
    TextView titleBar;

    public SearchBar(Context context) {
        super(context);
        init();
    }

    public SearchBar(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public SearchBar(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        init();
    }

    private void init() {
        inflate(getContext(), R.layout.search_bar_widget, this);
        ButterKnife.bind(this);
        searchEditText.setOnTouchListener(onTouchListener);
    }

    public void showSearchEditText() {
        searchEditText.setVisibility(VISIBLE);
        titleBar.setVisibility(GONE);
    }

    public void showTitleBar() {
        titleBar.setVisibility(VISIBLE);
        searchEditText.setVisibility(GONE);
    }

    public void setTitle(String title) {
        titleBar.setText(title);
    }

    private OnTouchListener onTouchListener = new OnTouchListener() {
        @Override
        public boolean onTouch(View view, MotionEvent event) {
            if (event.getAction() == MotionEvent.ACTION_UP) {
                int width = getContext().getResources().getDrawable(R.drawable.ic_action_delete).getIntrinsicWidth();
                if (event.getX() > (view.getWidth()-view.getPaddingRight()) - width) {
                    searchEditText.setText("");
                    return false;
                }
            }
            return false;
        }
    };

    private void hideKeyboard() {
        InputMethodManager inputMethodManager = (InputMethodManager) getContext()
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        inputMethodManager.hideSoftInputFromWindow(searchEditText.getWindowToken(), 0);
    }

    /**
     * Updates the color of the search bar depending on the mode of the tab
     * @param isIncognito True if the current tab is in incognito mode
     */
    public void setStyle(boolean isIncognito) {
        if (isIncognito) {
            searchEditText.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_incognito));
            searchEditText.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_incognito));
            titleBar.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_incognito));
            titleBar.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_incognito));
        } else {
            searchEditText.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_normal));
            searchEditText.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_normal));
            titleBar.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_normal));
            titleBar.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_normal));
        }
        final Drawable icon = ThemeUtils.getThemedDrawable(getContext(), R.drawable.ic_action_delete, true);
        searchEditText.setCompoundDrawablesWithIntrinsicBounds(null, null, icon, null);
        titleBar.setCompoundDrawablesWithIntrinsicBounds(null, null, icon, null);
    }

}
