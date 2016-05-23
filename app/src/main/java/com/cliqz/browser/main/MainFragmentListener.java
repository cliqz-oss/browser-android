package com.cliqz.browser.main;

import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.webview.SearchWebView;

/**
 * @author Stefano Pacifici
 * @date 2015/11/24
 */
class MainFragmentListener implements View.OnFocusChangeListener, TextWatcher {
    private final MainFragment fragment;
    private int queryLength;

    public static MainFragmentListener create(MainFragment fragment) {
        return new MainFragmentListener(fragment);
    }

    private MainFragmentListener(MainFragment fragment) {
        this.fragment = fragment;
        fragment.mAutocompleteEditText.setOnFocusChangeListener(this);
        fragment.mAutocompleteEditText.addTextChangedListener(this);
    }

    @Override
    public void onFocusChange(View v, boolean hasFocus) {
        Mode mode = fragment.state.getMode();
        if (!hasFocus) {
            fragment.telemetry.sendURLBarBlurSignal();
            fragment.hideKeyboard();
            if(mode == Mode.WEBPAGE) {
                fragment.searchBar.showTitleBar();
            }
        } else {
            fragment.timings.setUrlBarFocusedTime();
            // TODO: The next two lines should be in a method
            fragment.mSearchWebView.bringToFront();
            fragment.state.setMode(CliqzBrowserState.Mode.SEARCH);
            fragment.telemetry.sendURLBarFocusSignal("cards");
        }
    }

    @Override
    public void beforeTextChanged(CharSequence s, int start, int count, int after) {

    }

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {
        if (!fragment.mAutocompleteEditText.hasFocus()) {
            return;
        }

        // fragment.showSearch(null);

        final String q = s.toString();
        final SearchWebView searchWebView = fragment.mSearchWebView;
        final boolean shouldSend = ((start + count) != before) ||
                !q.equalsIgnoreCase(fragment.lastQuery);
        if (searchWebView != null && shouldSend) {
            fragment.lastQuery = q;
            searchWebView.onQueryChanged(q);
        }
    }

    @Override
    public void afterTextChanged(Editable s) {
        if (fragment.timings != null) {
            fragment.timings.setLastTypedTime();
        }
    }
}
