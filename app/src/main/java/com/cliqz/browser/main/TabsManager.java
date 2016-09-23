package com.cliqz.browser.main;

import android.content.Context;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.v4.app.FragmentManager;
import android.util.Log;
import android.webkit.WebView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;

import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.view.LightningView;

/**
 * Created by Ravjit on 21/07/16.
 */
public class TabsManager {

    private final List<TabFragment> mFragmentsList = new ArrayList<>();
    private final FragmentManager mFragmentManager;
    private int currentVisibleTab = -1;

    @Inject
    Telemetry telemetry;

    @Inject
    Bus bus;

    public TabsManager(Context context, FragmentManager fragmentManager) {
        mFragmentManager = fragmentManager;
        BrowserApp.getAppComponent().inject(this);
    }

    /**
     * @return The number of tabs currently open
     */
    public int getTabCount() {
        return mFragmentsList.size();
    }

    /**
     * @return The position of the currently visible Tab
     */
    public int getCurrentTabPosition() {
        return currentVisibleTab;
    }

    /**
     * @return The instance of currently visible Tab
     */
    public TabFragment getCurrentTab() {
        if (getCurrentTabPosition() == -1) {
            return null;
        } else {
            return mFragmentsList.get(getCurrentTabPosition());
        }
    }

    /**
     * @return Returns the tabfragment at the required position
     */
    public TabFragment getTab(int position) {
        return mFragmentsList.get(position);
    }

    /**
     * Method to switch between Tabs
     * @param position Position of the tab to switch to
     */
    public void showTab(int position) {
        mFragmentManager.beginTransaction()
                .replace(R.id.content_frame, mFragmentsList.get(position), MainActivity.TAB_FRAGMENT_TAG)
                .commit();
        currentVisibleTab = position;
    }

    /**
     * Create a new Tab and add it to the TabsList
     * @param bundle Arguments for the newly created Tab
     * @param showImmediately If true the view is switched to the newly created tab
     */
    public void addNewTab(@Nullable Bundle bundle, boolean showImmediately) {
        final TabFragment newTab = new TabFragment();
        newTab.setArguments(bundle);
        final String url = bundle != null ? bundle.getString(Constants.KEY_URL) : null;
        if (url != null && !url.isEmpty()) {
            newTab.state.setUrl(bundle.getString(Constants.KEY_URL));
            newTab.state.setTitle(bundle.getString(Constants.KEY_URL));
            newTab.state.setMode(CliqzBrowserState.Mode.WEBPAGE);
        }
        mFragmentsList.add(newTab);
        if (showImmediately) {
            showTab(mFragmentsList.size()-1);
        }
    }

    public void addNewTab(boolean isIncognito, boolean showImmediately) {
        final Bundle args = new Bundle();
        args.putBoolean(Constants.KEY_IS_INCOGNITO, isIncognito);
        addNewTab(args, showImmediately);
    }

    public void addNewTab(Bundle args) {
        addNewTab(args, true);
    }

    public void addNewTab(boolean isIncognito) {
        addNewTab(isIncognito, true);
    }

    /**
     * It closes the tab associated with the given {@link LightningView}, the method is meant to
     * close visible tabs and it tries to switch to another tab if the given one is the currently
     * visible one.
     * Generally this method is called to handle the
     * {@link acr.browser.lightning.bus.BrowserEvents.CloseWindow CloseWindow}
     * message.
     *
     * @param view a {@link LightningView} associate with the tab we want to close
     */
    public synchronized void closeTab(LightningView view) {
        int position = -1;
        final int currentTab = getCurrentTabPosition();
        for (int i = 0; i < mFragmentsList.size(); i++) {
            final TabFragment tab = mFragmentsList.get(i);
            if (tab != null && tab.mLightningView == view) {
                position = i;
                break;
            }
        }

        if (position > -1) {
            deleteTab(position);
            if (currentTab == position) {
                showTab(getCurrentTabPosition());
            }
        }
    }

    /**
     * Handles deleting Tabs at a given position and switching between Tabs after deleting the current Tab
     * @param position Position of the Tab to be deleted
     */
    public synchronized void deleteTab(int position) {
        if (position >= mFragmentsList.size()) {
            return;
        }

        TabFragment reference = mFragmentsList.get(position);
        if (reference == null) {
            return;
        }
        mFragmentsList.remove(position);
        if (reference.mLightningView != null) {
            reference.mLightningView.onDestroy();
        }
        if (mFragmentsList.size() == 0) {
            currentVisibleTab = 0;
            addNewTab(false, false);
        } else if (currentVisibleTab == mFragmentsList.size()) {
            currentVisibleTab-=1;
        }
        Log.d(Constants.TAG, "deleted tab");
    }


    public void pauseAllTabs() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
        }
        //Any webview is enough. Calling pauseTimers() on any one webview will pause timers of all webviews
        final WebView firstWebview = mFragmentsList.get(0).mLightningView.getWebView();
        if (firstWebview != null) {
            firstWebview.pauseTimers();
        }
        for (TabFragment tabFragment : mFragmentsList) {
            if (tabFragment.mLightningView == null) {
                continue;
            }
            final WebView webView = tabFragment.mLightningView.getWebView();
            if (webView != null) {
                webView.onPause();
            }
        }
    }

    public void resumeAllTabs() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
        }
        //Any webview is enough. Calling resumeTimers() on any one webview will resume timers of all webviews
        final WebView firstWebview = mFragmentsList.get(0).mLightningView.getWebView();
        if (firstWebview != null) {
            firstWebview.resumeTimers();
        }
        for (TabFragment tabFragment : mFragmentsList) {
            if (tabFragment.mLightningView == null) {
                continue;
            }
            final WebView webView = tabFragment.mLightningView.getWebView();
            if (webView != null) {
                webView.onResume();
            }
        }
    }

    public void setShouldReset(boolean shouldReset) {
        for (TabFragment tabFragment : mFragmentsList) {
            tabFragment.state.setShouldReset(shouldReset);
        }
    }
}

