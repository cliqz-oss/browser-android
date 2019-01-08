package com.cliqz.browser.widget;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.res.Resources;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.content.ContextCompat;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.AttributeSet;
import android.util.DisplayMetrics;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.view.inputmethod.InputMethodManager;
import android.widget.FrameLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.QueryManager;

import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.view.AnimatedProgressBar;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 */
public class SearchBar extends FrameLayout {

    public static final int ICON_STATE_CLEAR = 0;
    //public static final int RELOAD = 1;
    public static final int ICON_STATE_STOP = 2;
    public static final int ICON_STATE_NONE = 3;
    private float scaleX;
    private float scaleY;
    private float pivotX;
    private float pivotY;
    private AnimatedProgressBar progressBar;

    public interface Listener extends TextWatcher, OnFocusChangeListener {
        void onTitleClicked(SearchBar searchBar);

        void onStopClicked();

        void onQueryCleared(SearchBar searchBar);

        void onKeyboardOpen();

        void onBackIconPressed();
    }

    AutocompleteEditText searchEditText;

    @Inject
    QueryManager queryManager;

    @Bind(R.id.title_bar)
    TextView titleBar;

    @Nullable
    @Bind(R.id.tracker_counter)
    TextView trackerCounter;

    @Nullable
    @Bind(R.id.control_center)
    RelativeLayout antiTrackingDetails;

    private final Drawable clearIcon, backIcon;
    private int currentIcon;
    private

    @Nullable
    Listener mListener;

    public SearchBar(Context context) {
        this(context, null);
    }

    public SearchBar(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public SearchBar(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        BrowserApp.getAppComponent().inject(this);
        inflate(getContext(), R.layout.search_bar_widget, this);
        ButterKnife.bind(this);
        clearIcon = ContextCompat.getDrawable(context, R.drawable.ic_clear_search);
        backIcon = ContextCompat.getDrawable(context, R.drawable.ic_cliqz_back);
        int clearIconHeight = clearIcon.getIntrinsicHeight();
        titleBar.setHeight(clearIconHeight);
        if (trackerCounter != null) {
            trackerCounter.setFocusable(false);
            trackerCounter.setFocusableInTouchMode(false);
        }
        computeScales();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            antiTrackingDetails.setVisibility(GONE);
        }
    }

    private void computeScales() {
        final Resources resources = getContext().getResources();
        final WindowManager wm = (WindowManager) getContext().getSystemService(Context.WINDOW_SERVICE);
        final DisplayMetrics metrics = new DisplayMetrics();
        if (wm != null) {
            wm.getDefaultDisplay().getMetrics(metrics);
        }
        final int screenWidth = metrics.widthPixels;
        final float titleBarWidth = screenWidth - 2 * resources.getDimension(R.dimen.toolbar_menu_item_w)
                - 3 * resources.getDimension(R.dimen.toolbar_padding);
        final float titleBarHeight = resources.getDimension(R.dimen.title_bar_h);
        final float searchEditTextHeight = resources.getDimension(R.dimen.search_edit_text_h);
        final float toolBarPadding = resources.getDimension(R.dimen.toolbar_padding);
        scaleX = titleBarWidth / (float) screenWidth;
        scaleY = titleBarHeight / searchEditTextHeight;
        pivotX = (toolBarPadding* (float) screenWidth) / ((float) screenWidth - titleBarWidth);
        pivotY = searchEditTextHeight/2;
    }

    public void setSearchEditText(final AutocompleteEditText searchEditText) {
        this.searchEditText = searchEditText;
        final ListenerWrapper wrapper = new ListenerWrapper();
        this.searchEditText.addTextChangedListener(wrapper);
        this.searchEditText.setOnFocusChangeListener(wrapper);
        // TODO Fix this by removing the OnTouchListener and overriding the performClick on
        // AutocompleteEditText
        this.searchEditText.setOnTouchListener(new OnTouchListener() {
            @Override
            public boolean onTouch(View view, MotionEvent event) {
                if (event.getAction() != MotionEvent.ACTION_DOWN) {
                    return false;
                }
                final boolean isBackIconClicked = event.getX() <  searchEditText.getPaddingLeft() + backIcon.getIntrinsicWidth();
                final boolean isClearIconClicked = event.getX() > searchEditText.getWidth() - searchEditText.getPaddingRight() - clearIcon.getIntrinsicWidth();
                if (isBackIconClicked) {
                    showTitleBar();
                    if (mListener != null) {
                        mListener.onBackIconPressed();
                    }
                    return true;
                } else if (isClearIconClicked) {
                    searchEditText.setText("");
                    if (mListener != null) {
                        mListener.onQueryCleared(SearchBar.this);
                    }
                }
                return false;
            }
        });
    }

    @Nullable
    public AutocompleteEditText getSearchEditText() {
        return searchEditText;
    }

    public void setProgressBar(final AnimatedProgressBar progressBar) {
        this.progressBar = progressBar;
    }

    public void setListener(@Nullable Listener listener) {
        mListener = listener;
    }

    public String getSearchText() {
        return searchEditText.getText().toString();
    }

    @NonNull
    public String getQuery() {
        return searchEditText.getQuery();
    }

    public boolean isAutoCompleted() {
        return searchEditText.getVisibility() == VISIBLE && searchEditText.isAutocompleted();
    }

    public void requestSearchFocus() {
        searchEditText.requestFocus();
    }

    public void setCursorPosition(int length) {
        searchEditText.setSelection(length);
    }

    public void setAutocompleteText(String autocompleteText) {
        searchEditText.setAutocompleteText(autocompleteText);
    }

    public void showSearchEditText() {
        progressBar.setVisibility(GONE);
        switchIcon(true);
        //Dont redo the animation if the edittext is already visible
        if (searchEditText.getVisibility() == VISIBLE) {
            return;
        }
        searchEditText.setVisibility(VISIBLE);
        final Animation animation = new ScaleAnimation(scaleX, 1.0f, scaleY, 1.0f, pivotX, pivotY);
        animation.setDuration(150);
        searchEditText.startAnimation(animation);
        requestSearchFocus();
    }

    public void showTitleBar() {
        final String query = searchEditText.getQuery();
        if (query.length() == 0) {
            titleBar.setText("");
            titleBar.setHint(R.string.cliqz_search_hint);
        } else {
            titleBar.setText(query);
        }
        final Animation animation = new ScaleAnimation(1.0f, scaleX, 1.0f, scaleY, pivotX, pivotY);
        animation.setDuration(150);
        searchEditText.startAnimation(animation);
        searchEditText.setVisibility(View.GONE);
    }

    public void showProgressBar() {
        progressBar.setVisibility(VISIBLE);
    }


    public void setProgress(int progress) {
        //otherwise calling set progress makes it visible
        if (progressBar.getVisibility() == VISIBLE) {
            progressBar.setProgress(progress);
        }
    }

    public void setSearchText(String text) {
        searchEditText.setText(text);
    }

    public void selectAllText() {
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            @Override
            public void run() {
                searchEditText.setSelection(0,searchEditText.getText().length());
            }
        }, 200);
    }

    public void setTitle(String title) {
        // Be sure to not set the trampoline as the title
        final String nnTitle = title == null ? "" : title;
        final Uri titleAsUri = Uri.parse(nnTitle);
        if (TrampolineConstants.TRAMPOLINE_PAGE_TITLE.equals(nnTitle) || titleAsUri != null && titleAsUri.isHierarchical() && titleAsUri
                .getQueryParameter(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME) != null) {
            return;
        }
        titleBar.setText(title);
    }

    public void setQuery(String query) {
        searchEditText.setText(query);
    }

    @SuppressLint("SetTextI18n")
    public void updateQuery(String query) {
        final String q = query + " ";
        searchEditText.setText(q);
        setCursorPosition(q.length());
    }

    public void setAntiTrackingDetailsVisibility(int visibility) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            return;
        }
        if (antiTrackingDetails != null) {
            antiTrackingDetails.setVisibility(visibility);
            if (visibility == VISIBLE) {
                titleBar.setBackground(ContextCompat.getDrawable(getContext(),R.drawable.left_corners_rounded_bg));
                antiTrackingDetails.setBackground(ContextCompat.getDrawable(getContext(),R.drawable.right_corners_rounded_bg));
            } else {
                titleBar.setBackground(ContextCompat.getDrawable(getContext(),R.drawable.tab_item_bg_normal));
            }
        } else {
            titleBar.setBackground(ContextCompat.getDrawable(getContext(),R.drawable.tab_item_bg_normal));
        }
    }

    public void setTrackerCount(int count) {
        if (trackerCounter != null) {
            trackerCounter
                    .setText(String.format(Locale.getDefault(), "%d", count));
        }
    }

    public void setIsAutocompletionEnabled(boolean isAutocompleteionEnabled) {
        searchEditText.setIsAutocompletionEnabled(isAutocompleteionEnabled);
    }

    public void showKeyBoard() {
        InputMethodManager inputMethodManager = (InputMethodManager) getContext()
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        inputMethodManager.showSoftInput(searchEditText, InputMethodManager.SHOW_IMPLICIT);
        if (mListener != null) {
            mListener.onKeyboardOpen();
        }
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent event) {
        if (event.getAction() != MotionEvent.ACTION_DOWN) {
            return super.onInterceptTouchEvent(event);
        }
        if (antiTrackingDetails != null && antiTrackingDetails.getVisibility() == VISIBLE
                && event.getX() >= antiTrackingDetails.getX()) {
            return super.onInterceptTouchEvent(event);
        }

        final View visibleView = titleBar.getVisibility() == VISIBLE ? titleBar : searchEditText;
        final boolean isIconClicked = event.getX() > (visibleView.getWidth() - visibleView.getPaddingRight()) - clearIcon.getIntrinsicWidth();
        if (isIconClicked && visibleView == searchEditText) {
            switch (currentIcon) {
                case ICON_STATE_CLEAR:
                    showSearchEditText();
                    searchEditText.setText("");
                    if (mListener != null) {
                        mListener.onQueryCleared(SearchBar.this);
                    }
                    break;
                case ICON_STATE_STOP:
                    if (mListener != null) {
                        mListener.onStopClicked();
                    }
                    break;
            }
            return true;
        } else if (titleBar.getVisibility() == VISIBLE) {
            if (antiTrackingDetails != null) {
                setAntiTrackingDetailsVisibility(GONE);
            }
            showSearchEditText();
            if (mListener != null) {
                mListener.onTitleClicked(SearchBar.this);
            }
            return true;
        }
        return super.onInterceptTouchEvent(event);
    }

    /**
     * Displays or hides the 'X' icon in the status bar
     * If {@link #titleBar} is visible 'X' serves as Stop icon else if {@link #searchEditText} is visible
     * 'X' serves as Clear icon
     *
     * @param showIcon true if icon should be visible
     */
    public void switchIcon(boolean showIcon) {
        if ((currentIcon == ICON_STATE_CLEAR && showIcon) || (currentIcon == ICON_STATE_NONE && !showIcon)) {
            return;
        }
        if (showIcon) {
            searchEditText.setCompoundDrawablesWithIntrinsicBounds(backIcon, null, clearIcon, null);
            currentIcon = ICON_STATE_CLEAR;
        } else {
            searchEditText.setCompoundDrawablesWithIntrinsicBounds(backIcon, null, null, null);
            currentIcon = ICON_STATE_NONE;
        }
    }

    /**
     * Updates the color of the search bar depending on the mode of the tab
     *
     * @param isIncognito True if the current tab is in incognito mode
     */
    public void setStyle(boolean isIncognito) {
        if (isIncognito) {
            searchEditText.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_incognito));
            searchEditText.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_incognito));
            titleBar.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_incognito));
        } else {
            searchEditText.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_normal));
            searchEditText.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.url_bar_bg_normal));
            titleBar.setTextColor(ContextCompat.getColor(getContext(), R.color.url_bar_text_color_normal));
        }
    }

    private class ListenerWrapper implements TextWatcher, OnFocusChangeListener {

        @Override
        public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            if (mListener != null) {
                mListener.beforeTextChanged(s, start, count, after);
            }
        }

        @Override
        public void onTextChanged(CharSequence s, int start, int before, int count) {
            if (mListener != null) {
                mListener.onTextChanged(s, start, before, count);
            }
        }

        @Override
        public void afterTextChanged(Editable s) {
            if (mListener != null) {
                mListener.afterTextChanged(s);
                if (s.length() == 0) {
                    switchIcon(false);
                } else {
                    switchIcon(true);
                }
            }
        }

        @Override
        public void onFocusChange(View v, boolean hasFocus) {
            if (mListener != null) {
                mListener.onFocusChange(searchEditText, hasFocus);
            }

            if (hasFocus) {
                post(new Runnable() {
                    @Override
                    public void run() {
                        showKeyBoard();
                    }
                });
            } else {
                showTitleBar();
            }
        }
    }
}
