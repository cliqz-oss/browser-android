package com.cliqz.browser.main;

import android.support.v4.view.ViewCompat;
import android.text.Editable;
import android.view.View;

import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.webview.ExtensionEvents;
import com.cliqz.browser.widget.SearchBar;

import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.TrampolineConstants;

/**
 * @author Stefano Pacifici
 */
class TabFragmentListener implements SearchBar.Listener {
    private final TabFragment fragment;

    public static TabFragmentListener create(TabFragment fragment) {
        return new TabFragmentListener(fragment);
    }

    private TabFragmentListener(TabFragment fragment) {
        this.fragment = fragment;
        fragment.searchBar.setListener(this);
    }

    @Override
    public void onFocusChange(View v, boolean hasFocus) {
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
            ViewCompat.setElevation(fragment.mStatusBar, Utils.dpToPx(0));
        } else {
            fragment.bus.post(new Messages.AdjustPan());
            fragment.timings.setUrlBarFocusedTime();
            fragment.searchView.bringToFront();
            if (!ResumeTabDialog.isShown()) {
                fragment.telemetry.sendQuickAccessBarSignal(TelemetryKeys.SHOW, null,
                        fragment.getTelemetryView());
                fragment.quickAccessBar.show();
            }
            fragment.disableUrlBarScrolling();
            fragment.inPageSearchBar.setVisibility(View.GONE);
            fragment.resetFindInPage();
            fragment.telemetry.sendURLBarFocusSignal(fragment.state.isIncognito(),
                    fragment.getTelemetryView());
            fragment.searchView.notifySearchWebViewEvent(ExtensionEvents.CLIQZ_EVENT_URL_BAR_FOCUS);
            ViewCompat.setElevation(fragment.mStatusBar, Utils.dpToPx(5));
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
        final SearchView searchView = fragment.searchView;
        final boolean shouldSend = (((start + count) != before) ||
                !q.equalsIgnoreCase(fragment.lastQuery)) && !q.equals(fragment.state.getQuery());
        if (searchView != null && shouldSend) {
            fragment.lastQuery = q;
            searchView.updateQuery(q);
        }
        // TODO Stefano Are we shure?
        //        if (q.length() == 0 && fragment.querySuggestor != null) {
//            fragment.querySuggestor.clearSuggestions();
//        }
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
        final String url = fragment.mLightningView.getUrl();
        if (url.toLowerCase().startsWith(TrampolineConstants.CLIQZ_SCHEME)) {
            searchBar.setSearchText("");
        } else {
            searchBar.setSearchText(url);
        }
        searchBar.selectAllText();
        fragment.searchView.updateQuery("");
        fragment.mShowWebPageAgain = true;
        fragment.hideYTIcon();
    }

    @Override
    public void onStopClicked() {
        fragment.mLightningView.stopLoading();
    }

    @Override
    public void onQueryCleared(SearchBar searchBar) {
        fragment.telemetry.sendCLearUrlBarSignal(fragment.mIsIncognito,
                searchBar.getSearchText().length(), fragment.getTelemetryView());
        fragment.state.setQuery("");
    }

    @Override
    public void onKeyboardOpen() {
        fragment.telemetry.sendKeyboardSignal(true, fragment.mIsIncognito,
                fragment.getTelemetryView());
    }

    @Override
    public void onBackIconPressed() {
        fragment.telemetry.sendBackIconPressedSignal(fragment.mIsIncognito,
                fragment.searchView.isFreshTabVisible());
    }
}
