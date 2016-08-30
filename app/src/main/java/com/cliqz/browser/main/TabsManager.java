package com.cliqz.browser.main;

import android.content.Context;
import android.os.Bundle;
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

    public List<TabFragment> getTabsList() {
        return mFragmentsList;
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
     * Create a new Tab and add it to the TabsList and switches the view to it
     * @param bundle Arguments for the newly created Tab
     */
    public void addNewTab(Bundle bundle, boolean showImmediately) {
        final TabFragment newTab = new TabFragment();
        newTab.setArguments(bundle);
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
     * Handles deleting Tabs at a given position and switching between Tabs after deleting the current Tab
     * @param position Position of the Tab to be deleted
     */
    public synchronized void deleteTab(int position) {
        if (position >= mFragmentsList.size()) {
            return;
        }

        TabFragment reference = mFragmentsList.get(position);
        telemetry.sendTabCloseSignal(mFragmentsList.size() - 1, reference.state.isIncognito());
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
}

