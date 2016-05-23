package com.cliqz.browser.main;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.HistoryWebView;
import com.squareup.otto.Subscribe;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Stefano Pacifici
 * @date 2015/11/23
 */
public class HistoryFragment extends BaseFragment {

    private HistoryWebView mHistoryWebView;

    private boolean mJustCreated = false;

    @SuppressLint("ValidFragment")
    public HistoryFragment(Activity activity) {
        super();
        createWebView(activity);
    }

    public HistoryFragment() {
        super();
    }

    private void createWebView(Activity activity) {
        // Must use activity due to Crosswalk webview
        mHistoryWebView = new HistoryWebView(activity);
        mHistoryWebView.setLayoutParams(
                new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
    }

    @Override
    protected View onCreateContentView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        if (mHistoryWebView == null) {
            createWebView(getActivity());
            mJustCreated = true;
        }
        final ViewGroup parent = (ViewGroup) mHistoryWebView.getParent();
        if (parent != null) {
            parent.removeView(mHistoryWebView);
        }
        return mHistoryWebView;
    }

    @Override
    public void onResume() {
        super.onResume();
        if (mHistoryWebView != null) {
            mHistoryWebView.onResume();
            if (!mJustCreated) {
                mHistoryWebView.fourceUpdateHistory();
            }
            mJustCreated = false;
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (mHistoryWebView != null) {
            mHistoryWebView.onPause();
        }
    }

    @Override
    protected int getMenuResource() {
        return R.menu.fragment_history_menu;
    }

    @Override
    protected boolean onMenuItemClick(MenuItem item) {
        switch (item.getItemId()) {
            case R.id.menu_settings:
                delayedPostOnBus(new Messages.GoToSettings());
                return true;
            default:
                return false;
        }
    }

    @Override
    public void onViewCreated(View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ButterKnife.bind(this, view);
    }

    @OnClick(R.id.menu_search)
    void downClicked() {
        bus.post(new Messages.GoToSearch());
    }

    @Override
    protected int getFragmentTheme() {
        return R.style.Theme_Cliqz_History;
    }

    @Override
    public void onStart() {
        super.onStart();
        telemetry.sendLayerChangeSignal("past");

        final PreferenceManager.ClearQueriesOptions clear = preferenceManager.shouldClearQueries();
        if (clear != PreferenceManager.ClearQueriesOptions.NO) {
            mHistoryWebView.cleanupQueries(clear == PreferenceManager.ClearQueriesOptions.CLEAR_QUERIES_INCLUDING_FAVORITES);
            preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.NO);
        }
    }

    @Nullable
    @Override
    protected View onCreateCustomToolbarView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_history_toolbar, container, false);
    }

    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        MainFragment mainFragment = (MainFragment)getActivity()
                .getSupportFragmentManager()
                .findFragmentByTag(MainActivity.SEARCH_FRAGMENT_TAG);
        if(mainFragment != null) {
            final String s = state.getMode() == CliqzBrowserState.Mode.WEBPAGE ? "web" : "cards";
            telemetry.sendBackPressedSignal("past", s, mainFragment.mAutocompleteEditText.length());
        }
        bus.post(new Messages.GoToSearch());
    }

    @Subscribe
    public void onOpenLink(CliqzMessages.OpenLink event) {
        bus.post(new Messages.GoToLink(event.url));
    }

    @Subscribe
    public void onNotifyQuery(CliqzMessages.NotifyQuery event) {
        bus.post(new Messages.GoToSearch(event.query));
    }
}
