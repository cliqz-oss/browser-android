package com.cliqz.browser.main;

import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.support.annotation.Nullable;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentTransaction;
import android.webkit.WebView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.RelativelySafeUniqueId;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.nove.Bus;

import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.view.LightningView;
import acr.browser.lightning.view.TrampolineConstants;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
public class TabsManager {

    @SuppressWarnings("WeakerAccess")
    public class Builder {
        private boolean mWasCreated = false;
        private boolean mForgetMode = false;
        @SuppressWarnings("unused")
        private TabFragment mFromTab = null;
        private String mUrl = null;
        private String mQuery = null;
        private Message mMessage = null;
        private String mId = null;
        private String mTitle = "";
        private boolean mRestore = false;

        private Builder() {}

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

        public Builder setId(String id) {
            mId = id;
            return this;
        }

        public Builder setTitle(String title) {
            mTitle = title != null ? title : "";
            return this;
        }

        public Builder setRestore(@SuppressWarnings("SameParameterValue") boolean restore) {
            this.mRestore = restore;
            return this;
        }

        public int create() {
            if (mWasCreated) {
                throw new RuntimeException("Can't use the same builder twice");
            }
            mWasCreated = true;

            final TabFragment newTab = new TabFragment();
            final Bundle arguments = new Bundle();
            arguments.putBoolean(MainActivity.EXTRA_IS_PRIVATE, mForgetMode);
            if (mUrl != null) {
                arguments.putString(TabFragment.KEY_URL, mUrl);
            }
            if (mQuery != null) {
                arguments.putString(TabFragment.KEY_QUERY, mQuery);
            }
            if (mMessage != null) {
                arguments.putParcelable(TabFragment.KEY_NEW_TAB_MESSAGE, mMessage);
            }

            if (mId == null) {
                mId = RelativelySafeUniqueId.createNewUniqueId();
            }
            arguments.putString(TabFragment.KEY_TAB_ID, mId);
            arguments.putBoolean(TabFragment.KEY_FORCE_RESTORE, mRestore);

            if (mTitle != null) {
                arguments.putString(TabFragment.KEY_TITLE, mTitle);
            }
            newTab.setArguments(arguments);
            final int position = mFragmentsList.size();
            mFragmentsList.add(newTab);
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

    @Inject
    WebViewPersister persister;

    public TabsManager(FragmentManager fragmentManager) {
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
    @Nullable
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
     *
     * @param position Position of the tab to switch to
     */
    public void showTab(int position) {
        final TabFragment tab = mFragmentsList.get(position);
        mFragmentManager.beginTransaction()
                .replace(R.id.content_frame, tab, MainActivity.TAB_FRAGMENT_TAG)
                .commitAllowingStateLoss();
        currentVisibleTab = position;
        persister.visit(tab.getTabId());
    }

    /**
     * Method to switch between Tabs with an animation
     *
     * @param position Position of the tab to switch to
     * @param animation Animation for the enter transition
     */
    public void showTab(int position, int animation) {
        final TabFragment tab = mFragmentsList.get(position);
        final FragmentTransaction transaction = mFragmentManager.beginTransaction();
        if (Build.VERSION.SDK_INT != Build.VERSION_CODES.M) {
            //cannot pass null for exit animation
            transaction.setCustomAnimations(animation, R.anim.dummy_transition);
        }
        transaction.replace(R.id.content_frame, tab, MainActivity.TAB_FRAGMENT_TAG);
        transaction.commit();
        currentVisibleTab = position;
        persister.visit(tab.getTabId());
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
    synchronized void closeTab(LightningView view) {
        int position = findTabFor(view);
        // We have also to delete the persisted state for the tab
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
    int findTabFor(LightningView view) {
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
     *
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
        persister.remove(reference.getTabId());
        if (reference.mLightningView != null) {
            reference.mLightningView.stopLoading();
            reference.mLightningView.onDestroy();
        }
        if (mFragmentsList.size() == 0) {
            currentVisibleTab = 0;
            buildTab().show();
        } else {
            currentVisibleTab = currentVisibleTab > 0 ? currentVisibleTab - 1 : 0;
        }
    }

    /**
     * Handles closing all tabs from the 3-dots menu
     */
    public void deleteAllTabs() {
        for (TabFragment fragment : mFragmentsList) {
            if (fragment.mLightningView != null) {
                fragment.mLightningView.stopLoading();
                fragment.mLightningView.onDestroy();
            }
            persister.remove(fragment.getTabId());
        }

        mFragmentsList.clear();
        currentVisibleTab = 0;
        buildTab().show();
    }

    void pauseAllTabs() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
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

    void resumeAllTabs() {
        if (mFragmentsList.size() == 0 || mFragmentsList.get(0).mLightningView == null) {
            return;
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

    /**
     * Delete all the stored tabs data, use this one if you do not want to create a new empty tab.
     */
    void clearTabsData() {
        persister.clearTabsData();
    }

    boolean restoreTabs() {
        final List<Bundle> storedTabs = persister.loadTabsMetaData();
        long lastVisited = 0;
        for (final Bundle bundle: storedTabs) {
            lastVisited = Math.max(lastVisited, bundle.getLong(TabBundleKeys.LAST_VISIT, 0L));
        }
        int counter = 0;
        for (final Bundle bundle: storedTabs) {
            final boolean isIncognito = bundle.getBoolean(TabBundleKeys.IS_INCOGNITO);
            final String title = bundle.getString(TabBundleKeys.TITLE);
            final String id = bundle.getString(TabBundleKeys.ID);
            final String url = bundle.getString(TabBundleKeys.URL);
            // !!! HOTFIX FOR VERSION 1.7.0.5 !!!
            // Do not restore tabs that contain the trampoline close command. If this is the only
            // opened tab, it will cause the app to close itself.
            if (url != null && url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_CLOSE_FORMAT)){
                continue;
            }
            final Builder tabBuilder = buildTab()
                    .setForgetMode(isIncognito)
                    .setRestore(true)
                    .setId(id)
                    .setTitle(title)
                    .setUrl(url);
            final long visitTime = bundle.getLong(TabBundleKeys.LAST_VISIT, 0L);
            if (lastVisited == visitTime) {
                tabBuilder.show();
            } else {
                tabBuilder.create();
            }
            counter++;
        }
        return counter > 0;
    }
}

