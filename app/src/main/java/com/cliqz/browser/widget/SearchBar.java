package com.cliqz.browser.widget;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.res.Resources;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.AttributeSet;
import android.util.DisplayMetrics;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.animation.Animation;
import android.view.animation.ScaleAnimation;
import android.view.inputmethod.InputMethodManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatImageView;
import androidx.core.content.ContextCompat;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.QueryManager;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.view.AnimatedProgressBar;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 */
public class SearchBar extends FrameLayout {

    public static final String HTTPS_PREFIX = "HTTPS://";
    public static final String HTTP_PREFIX = "HTTP://";
    private float scaleX;
    private float scaleY;
    private float pivotX;
    private float pivotY;
    private AnimatedProgressBar progressBar;
    private boolean mShowSearchEditTextAnimationRunning = false;
    private boolean mShowTitleBarAnimationRunning = false;

    public interface Listener extends TextWatcher, OnFocusChangeListener {
        void onTitleClicked(SearchBar searchBar);

        void onKeyboardOpen();
    }

    AutocompleteEditText searchEditText;

    @Inject
    QueryManager queryManager;

    @BindView(R.id.icon_lock)
    AppCompatImageView lock;

    @BindView(R.id.title_bar)
    TextView titleBar;

    @Nullable
    @BindView(R.id.tracker_counter)
    TextView trackerCounter;

    @Nullable
    @BindView(R.id.control_center)
    ViewGroup antiTrackingDetails;

    @Nullable
    Listener mListener;

    @Nullable
    @BindView(R.id.reader_mode_button)
    View readerModeButton;

    @Inject
    Bus bus;

    public SearchBar(Context context) {
        this(context, null);
    }

    public SearchBar(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public SearchBar(Context context, AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        BrowserApp.getAppComponent().inject(this);
        bus.register(this);
        inflate(getContext(), R.layout.search_bar_widget, this);
        ButterKnife.bind(this);
        if (trackerCounter != null) {
            trackerCounter.setFocusable(false);
            trackerCounter.setFocusableInTouchMode(false);
        }
        computeScales();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP && antiTrackingDetails != null) {
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
    }

    @Subscribe
    void onSearchBarBackPressed(@Nullable Messages.SearchBarBackPressed msg) {
        showTitleBar();
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
        final Editable editable = searchEditText.getText();
        return editable != null ? editable.toString() : "";
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
        if (mShowSearchEditTextAnimationRunning || searchEditText.getVisibility() == VISIBLE) {
            return;
        }
        mShowSearchEditTextAnimationRunning = true;

        progressBar.setVisibility(GONE);
        final Animation animation = new ScaleAnimation(scaleX, 1.0f, scaleY, 1.0f, pivotX, pivotY);
        animation.setDuration(150);
        animation.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {
                searchEditText.setVisibility(VISIBLE);
                requestSearchFocus();
            }

            @Override
            public void onAnimationEnd(Animation animation) {
                mShowSearchEditTextAnimationRunning = false;
            }

            @Override
            public void onAnimationRepeat(Animation animation) {

            }
        });
        searchEditText.startAnimation(animation);
    }

    public void showTitleBar() {
        if (mShowTitleBarAnimationRunning || searchEditText.getVisibility() != VISIBLE) {
            return;
        }
        mShowTitleBarAnimationRunning = true;
        final Animation animation = new ScaleAnimation(1.0f, scaleX, 1.0f, scaleY, pivotX, pivotY);
        animation.setDuration(150);
        animation.setAnimationListener(new Animation.AnimationListener() {
            @Override
            public void onAnimationStart(Animation animation) {
                searchEditText.clearFocus();
            }

            @Override
            public void onAnimationEnd(Animation animation) {
                searchEditText.setVisibility(GONE);
                mShowTitleBarAnimationRunning = false;
            }

            @Override
            public void onAnimationRepeat(Animation animation) {

            }
        });
        searchEditText.startAnimation(animation);
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
        new Handler(Looper.getMainLooper()).postDelayed(() ->
                searchEditText.setSelection(0,getSearchText().length()), 200);
    }

    public void setTitle(@Nullable String title) {
        // Be sure to not set the trampoline as the title
        final String nnTitle = title == null ? "" : title;
        final Uri titleAsUri = Uri.parse(nnTitle);
        if (TrampolineConstants.TRAMPOLINE_PAGE_TITLE.equals(nnTitle) || titleAsUri != null && titleAsUri.isHierarchical() && titleAsUri
                .getQueryParameter(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME) != null) {
            return;
        }
        final String upperCaseTitle = nnTitle.toUpperCase();
        final String cleanTitle;
        if (upperCaseTitle.startsWith(HTTPS_PREFIX)) {
            cleanTitle = nnTitle.substring(HTTPS_PREFIX.length());
        } else if (upperCaseTitle.startsWith(HTTP_PREFIX)) {
            cleanTitle = nnTitle.substring(HTTP_PREFIX.length());
        } else {
            cleanTitle = nnTitle;
        }
        titleBar.setText(cleanTitle);
    }

    public void setSecure(boolean secure) {
        lock.setVisibility(secure ? VISIBLE : GONE);
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
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || antiTrackingDetails == null) {
            return;
        }
        antiTrackingDetails.setVisibility(visibility);
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

        if (readerModeButton != null && readerModeButton.getVisibility() == VISIBLE
                && event.getX() >= readerModeButton.getX()) {
            return super.onInterceptTouchEvent(event);
        }

        if (titleBar.getVisibility() == VISIBLE) {
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
     * Updates the color of the search bar depending on the mode of the tab
     *
     * @param isIncognito True if the current tab is in incognito mode
     */
    public void setStyle(boolean isIncognito) {
        final Context context = getContext();
        if (BuildConfig.IS_NOT_LUMEN) {
            if (isIncognito) {
                searchEditText.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_incognito));
                searchEditText.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_incognito));
                titleBar.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_incognito));
                titleBar.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_incognito));
            } else {
                searchEditText.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_normal));
                searchEditText.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_normal));
                titleBar.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_normal));
                titleBar.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_normal));
            }
        } else {
            if (isIncognito) {
                searchEditText.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_incognito));
                searchEditText.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_incognito));
                titleBar.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_incognito));
                titleBar.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_incognito));
            } else {
                searchEditText.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_normal));
                searchEditText.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_normal));
                titleBar.setTextColor(ContextCompat.getColor(context, R.color.url_bar_text_color_normal));
                titleBar.setBackgroundColor(ContextCompat.getColor(context, R.color.url_bar_bg_normal));
            }
        }
    }

    @Override
    public void clearFocus() {
        searchEditText.clearFocus();
        super.clearFocus();
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
            }
        }

        @Override
        public void onFocusChange(View v, boolean hasFocus) {
            if (mListener != null) {
                mListener.onFocusChange(searchEditText, hasFocus);
            }

            if (hasFocus) {
                post(SearchBar.this::showKeyBoard);
                bus.post(new Messages.DismissVpnPanel());
                bus.post(new Messages.DismissControlCenter());
            }
//            } else {
//                showTitleBar();
//            }
        }
    }
}
