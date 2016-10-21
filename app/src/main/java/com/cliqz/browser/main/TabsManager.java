package com.cliqz.browser.main;

import android.content.Context;
import android.os.Bundle;
import android.os.Message;
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

    public class Builder {
        private boolean mWasCreated = false;
        private boolean mForgetMode = false;
        private TabFragment mFromTab = null;
        private String mUrl = null;
        private String mQuery = null;
        private Message mMessage = null;

        private Builder() {};

        public Builder setForgetMode(boolean value) {
            mForgetMode = value;
            return this;
        }

        public Builder setOriginTab(TabFragment from) {
            mFromTab = from;
            return this;
        }

        public Builder setUrl(String url) {
            mUrl = url;
            return this;
        }

        public Builder setQuery(String query) {
            mQuery = query;
            return this;
        }

        public Builder setMessage(Message message) {
            mMessage = message;
            return this;
        }

        public int create() {
            if (mWasCreated) {
                throw new RuntimeException("Can't use the same builder twice");
            }
            mWasCreated = true;

            final TabFragment newTab = new TabFragment();
            final Bundle arguments = new Bundle();
            arguments.putBoolean(Constants.KEY_IS_INCOGNITO, mForgetMode);
            if (mUrl != null) {
                arguments.putString(Constants.KEY_URL, mUrl);
            }
            if (mQuery != null) {
                arguments.putString(Constants.KEY_QUERY, mQuery);
            }
            if (mMessage != null) {
                arguments.putParcelable(Constants.KEY_NEW_TAB_MESSAGE, mMessage);
            }
            newTab.setArguments(arguments);
            final int position;
            final int foundPosition = mFromTab != null ? mFragmentsList.indexOf(mFromTab) : -1;
            if (foundPosition < 0 || foundPosition >= mFragmentsList.size() - 1) {
                position = mFragmentsList.size();
                mFragmentsList.add(newTab);
            } else {
                position = foundPosition + 1;
                mFragmentsList.add(position, newTab);
            }
            return position;
        }

        public int show() {
            final int position = create();
            if (position < 0 || position >= mFragmentsList.size()) {
                return -1;
            }
            showTab(position);
            return position;
        }
    }

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
     * Create a new {@link Builder}
     *
     * @return the new {@link Builder}
     */
    public Builder buildTab() {
        return new Builder();
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
        int position = findTabFor(view);
        final int currentTab = getCurrentTabPosition();
        if (position > -1) {
            deleteTab(position);
            if (currentTab == position) {
                showTab(getCurrentTabPosition());
            }
        }
    }

    /**
     * Given a {@link LightningView} try to find it between the fragments list and return the index
     *
     * @param view the {@link LightningView} the user wants to search for
     * @return the Tab index if we found a tab, -1 otherwise
     */
    public int findTabFor(LightningView view) {
        for (int i = 0; i < mFragmentsList.size(); i++) {
            final TabFragment tab = mFragmentsList.get(i);
            if (tab != null && tab.mLightningView == view) {
                return i;
            }
        }
        return -1;
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
            buildTab().show();
        } else {
            currentVisibleTab-=1;
        }
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

