package com.cliqz.browser.main;

import android.content.res.Configuration;
import android.text.Editable;
import android.view.View;

import androidx.core.view.ViewCompat;

import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.widget.SearchBar;

import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.TrampolineConstants;

/**
 * @author Stefano Pacifici
 */
class TabFragmentListener implements SearchBar.Listener {
    private final TabFragment2 fragment;

    public static TabFragmentListener create(TabFragment2 fragment) {
        return new TabFragmentListener(fragment);
    }

    private TabFragmentListener(TabFragment2 fragment) {
        this.fragment = fragment;
        fragment.searchBar.setListener(this);
    }

    @Override
    public void onFocusChange(View v, boolean hasFocus) {
        final SearchView searchView = fragment.searchView2;
        if (searchView != null) {
            searchView.handleUrlbarFocusChange(hasFocus);
        }
        Mode mode = fragment.state.getMode();
        if (!hasFocus) {
            fragment.telemetry.sendURLBarBlurSignal(fragment.state.isIncognito(),
                    fragment.getTelemetryView());
            fragment.hideKeyboard(null);
            if(mode == Mode.WEBPAGE) {
                fragment.searchBar.showTitleBar();
                fragment.searchBar.showProgressBar();
                fragment.searchBar.setAntiTrackingDetailsVisibility(View.VISIBLE);
            }
            ViewCompat.setElevation(fragment.statusBar, Utils.dpToPx(0));
        } else {
            fragment.bus.post(new Messages.AdjustPan());
            fragment.timings.setUrlBarFocusedTime();
            fragment.bringSearchToFront();
            if (!ResumeTabDialog.isShown()) {
                fragment.telemetry.sendQuickAccessBarSignal(TelemetryKeys.SHOW, null,
                        fragment.getTelemetryView());
                if (fragment.quickAccessBar != null
                        && fragment.getResources().getConfiguration().
                        orientation == Configuration.ORIENTATION_PORTRAIT) {
                    fragment.quickAccessBar.show();
                }
            }
            fragment.inPageSearchBar.setVisibility(View.GONE);
            fragment.resetFindInPage();
            fragment.telemetry.sendURLBarFocusSignal(fragment.state.isIncognito(),
                    fragment.getTelemetryView());
            ViewCompat.setElevation(fragment.statusBar, Utils.dpToPx(5));
        }
    }

    @Override
    public void beforeTextChanged(CharSequence s, int start, int count, int after) {

    }

    @Override
    public void onTextChanged(CharSequence s, int start, int before, int count) {
        if (!fragment.searchEditText.hasFocus()) {
            return;
        }

        if (fragment.isHomePageShown) {
            fragment.isHomePageShown = false;
            return;
        }
        // fragment.showSearch(null);

        final String q = s.toString();
        final SearchView searchView = fragment.searchView2;
        final boolean shouldSend = (((start + count) != before) ||
                !q.equalsIgnoreCase(fragment.lastQuery)) && !q.equals(fragment.state.getQuery());
        if (searchView != null && shouldSend && (q.isEmpty() || !q.equals(fragment.getUrl()))) {
            fragment.lastQuery = q;
            searchView.updateQuery(q, start, count);
        }
        // TODO Stefano Are we sure?
        // if (q.length() == 0 && fragment.querySuggestor != null) {
        //     fragment.querySuggestor.clearSuggestions();
        // }
    }

    @Override
    public void afterTextChanged(Editable s) {
        if (fragment.timings != null) {
            fragment.timings.setLastTypedTime();
        }
    }

    @Override
    public void onTitleClicked(SearchBar searchBar) {
        if (fragment.state.getMode() == Mode.SEARCH) {
            searchBar.setQuery(fragment.state.getQuery());
            fragment.searchQuery(fragment.state.getQuery());
            return;
        }
        fragment.state.setMode(Mode.SEARCH);
        final String url = fragment.getUrl();
        if (url.toLowerCase().contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME+"=")) {
            searchBar.setSearchText("");
        } else {
            searchBar.setSearchText(url);
        }
        searchBar.selectAllText();
        fragment.searchView2.updateQuery("", 0, -1);
        fragment.setShowWebPageAgain(true);
    }

    @Override
    public void onKeyboardOpen() {
        fragment.telemetry.sendKeyboardSignal(true, fragment.mIsIncognito,
                fragment.getTelemetryView());
    }
}
