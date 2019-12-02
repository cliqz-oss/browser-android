package com.cliqz.browser.tabs;

import android.graphics.Bitmap;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Message;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.util.Consumer;

import com.cliqz.browser.annotations.PerActivity;
import com.cliqz.browser.main.CliqzWebViewFactory;
import com.cliqz.browser.main.TabBundleKeys;
import com.cliqz.browser.main.TabFragment2;
import com.cliqz.browser.utils.RelativelySafeUniqueId;
import com.cliqz.browser.utils.WebViewPersister;
import com.facebook.react.bridge.AssertionException;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.view.CliqzWebView;
import acr.browser.lightning.view.TrampolineConstants;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
@PerActivity
public class TabsManager {

    public class Builder {
        private boolean mWasCreated = false;
        private boolean mForgetMode = false;
        private String mUrl = null;
        private String mQuery = null;
        private Message mMessage = null;
        private String mId = null;
        private String mTitle = "";
        private String mParentId = null;
        private Bitmap mFavicon = null;
        private boolean mRestore = false;
        private boolean mOpenVpnPanel = false;

        private Builder() {}

        public Builder setForgetMode(boolean value) {
            mForgetMode = value;
            return this;
        }

        @SuppressWarnings({"unused", "WeakerAccess"})
        public Builder setOriginTab(@Nullable String parentId) {
            mParentId = parentId;
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

        public Builder setFavicon(Bitmap favicon) {
            mFavicon = favicon;
            return this;
        }

        @SuppressWarnings("WeakerAccess")
        public Builder setRestore(@SuppressWarnings("SameParameterValue") boolean restore) {
            this.mRestore = restore;
            return this;
        }

        @SuppressWarnings("WeakerAccess")
        public Builder setOpenVpnPanel() {
            this.mOpenVpnPanel = true;
            return this;
        }

        @NonNull
        public String create() {
            if (mWasCreated) {
                throw new RuntimeException("Can't use the same builder twice");
            }
            mWasCreated = true;

            final String id;
            if (mId != null) {
                id = mId;
            } else {
                id = RelativelySafeUniqueId.createNewUniqueId();
            }
            final TabFragment2 newTab = TabFragment2.createTabWithId(id);

            final TabImpl tab = new TabImpl(id, mParentId, newTab);
            tab.setIncognito(mForgetMode);

            // arguments.putBoolean(TabFragment2.KEY_OPEN_VPN_PANEL, mOpenVpnPanel);
            if (mUrl != null && !mUrl.isEmpty()) {
                tab.setUrl(mUrl);
                tab.setMode(Tab.Mode.WEBPAGE);
            } else {
                tab.setUrl("");
                tab.setMode(Tab.Mode.SEARCH);
            }
            if (mQuery != null) {
               tab.setQuery(mQuery);
            }
            if (mMessage != null) {
                tab.setMessage(mMessage);
            }

            // arguments.putBoolean(TabFragment2.KEY_FORCE_RESTORE, mRestore);

            if (mTitle != null) {
                tab.setTitle(mTitle);
            }

            if (mFavicon != null) {
                tab.setFavIcon(mFavicon);
            }

            mFragmentsList.put(id, tab);
            return id;
        }
    }

    public interface RestoreTabListener {
        void onTabRestored(@NonNull CliqzWebView webView);
    }

    private final Map<String, TabImpl> mFragmentsList = new LinkedHashMap<>();
    private final CliqzWebViewFactory webViewFactory;
    private String currentVisibleTab = null;
    private final WebViewPersister persister;

    @Inject
    public TabsManager( @NonNull WebViewPersister persister,
                        @NonNull CliqzWebViewFactory webViewFactory) {
        this.persister = persister;
        this.webViewFactory = webViewFactory;
    }

    @NonNull
    public Collection<Tab> getAllTabs() {
        return Collections.unmodifiableCollection(mFragmentsList.values());
    }


    /**
     * @return The number of tabs currently open
     */
    public int getTabCount() {
        return mFragmentsList.size();
    }

    /**
     * @return The id of the currently visible Tab, or null if no tab is available
     */
    @Nullable
    public String getCurrentTabId() {
        if ((currentVisibleTab == null || !mFragmentsList.containsKey(currentVisibleTab))
                && !mFragmentsList.isEmpty()) {
            currentVisibleTab = mFragmentsList.values().iterator().next().id;
        }
        return currentVisibleTab;
    }

    /**
     * Select the a tab
     *
     * @param tabId the id of the tab to be selected
     */
    public final void selectTab(@NonNull String tabId) {
        if (mFragmentsList.containsKey(tabId)) {
            currentVisibleTab = tabId;
        }
    }

    /**
     * @return The instance of currently visible Tab, or null if no tab is available
     */
    @Nullable
    public Tab getSelectedTab() {
        final String currentTabId = getCurrentTabId();
        return mFragmentsList.get(currentTabId);
    }

    /**
     * @return Returns the tabfragment for the required id (if it exists)
     */
    @Nullable
    public Tab getTab(@NonNull String id) {
        return mFragmentsList.get(id);
    }

    @Nullable
    public TabFragment2 getSelectedTabFragment() {
        final TabImpl tab = mFragmentsList.get(currentVisibleTab);
        if (tab != null) {
            persister.visit(tab.id);
        }
        return tab != null ? tab.fragment : null;
    }

    /**
     * Create a new {@link Builder}
     *
     * @return the new {@link Builder}
     */
    public Builder buildTab() {
        return new Builder();
    }

    public void restoreTab(@NonNull final String tabId, @NonNull final RestoreTabListener listener) {
        final TabImpl tab = mFragmentsList.get(tabId);
        if (tab == null) {
            throw new AssertionException("Invalid tab id");
        }
        final CliqzWebView cachedWebView = tab.getCachedWebView();
        if (cachedWebView != null) {
            listener.onTabRestored(cachedWebView);
        } else {
            webViewFactory.createWebView(webView -> {
                tab.setCachedWebView(webView);
                tab.setIncognito(tab.isIncognito());
                persister.restore(tabId, webView);
                listener.onTabRestored(webView);
            });
        }
    }

    /**
     * It closes the tab associated with the given id, the method is meant to
     * close visible tabs and it tries to switch to another tab if the given one is the currently
     * visible one.
     * Generally this method is called to handle the
     * {@link acr.browser.lightning.bus.BrowserEvents.CloseWindow CloseWindow}
     * message.
     *
     * @param tabId id of the tab we want to close
     */
    public synchronized void closeTab(@NonNull String tabId) {
        final Tab tabToRemove = mFragmentsList.get(tabId);
        if (tabToRemove == null) {
            return;
        }

        mFragmentsList.remove(tabId);
        persister.remove(tabId);

        if (!tabId.equals(currentVisibleTab)) {
            // We close a generic tab, nothing to do here
            return;
        }

        switch (mFragmentsList.size()) {
            case 0:
                break;
            case 1:
                currentVisibleTab = mFragmentsList.values().iterator().next().id;
                break;
            default:
                // Show the parent if possible
                final Tab parent = mFragmentsList.get(tabToRemove.parentId);
                if (parent != null) {
                    currentVisibleTab = parent.id;
                    return;
                }
                String lastTabId = null;
                for (Tab tab: mFragmentsList.values()) {
                    lastTabId = tab.id;
                }
                currentVisibleTab = lastTabId;
        }
    }

    /**
     * Handles closing all tabs from the 3-dots menu
     */
    public void deleteAllTabs() {
        for (TabImpl tab : mFragmentsList.values()) {
            tab.fragment.onDeleteTab();
            persister.remove(tab.id);
        }

        mFragmentsList.clear();
        currentVisibleTab = buildTab().create();
    }

    public void pauseAllTabs() {
        performOpNonNullWebViews(CliqzWebView::onPause);
    }

    public void resumeAllTabs() {
        performOpNonNullWebViews(CliqzWebView::onResume);
    }

    private void performOpNonNullWebViews(Consumer<CliqzWebView> op) {
        for (TabImpl tab: mFragmentsList.values()) {
            final CliqzWebView webView = tab.getCachedWebView();
            if (webView != null) {
                op.accept(webView);
            }
        }
    }

    /**
     * Delete all the stored tabs data, use this one if you do not want to create a new empty tab.
     */
    public void clearTabsData() {
        persister.clearTabsData();
    }

    public boolean restoreTabs(List<Bundle> storedTabs) {
        long lastVisited = 0;
        for (final Bundle bundle: storedTabs) {
            lastVisited = Math.max(lastVisited, bundle.getLong(TabBundleKeys.LAST_VISIT, 0L));
        }
        int counter = 0;
        for (final Bundle bundle: storedTabs) {
            final boolean isIncognito = bundle.getBoolean(TabBundleKeys.IS_INCOGNITO);
            final String title = bundle.getString(TabBundleKeys.TITLE);
            final String id = bundle.getString(TabBundleKeys.ID);
            final String parentId = bundle.getString(TabBundleKeys.PARENT_ID);
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
            if (parentId != null && !parentId.isEmpty()) {
                tabBuilder.setOriginTab(parentId);
            }
            final long visitTime = bundle.getLong(TabBundleKeys.LAST_VISIT, 0L);
            if (lastVisited == visitTime) {
                currentVisibleTab = tabBuilder.create();
            } else {
                tabBuilder.create();
            }
            counter++;
        }
        return counter > 0;
    }

    public void unloadUnusedTabs() {
        final String currentTabId = getCurrentTabId();
        for (TabImpl tab: mFragmentsList.values()) {
            if (!tab.id.equals(currentTabId)) {
                tab.setCachedWebView(null);
            }
        }
    }

    public void loadTabsMetaData(Consumer<List<Bundle>> callback) {
        new RestoreTabsTask(persister, callback).execute();
    }

    private static class RestoreTabsTask extends AsyncTask<Void, Void, List<Bundle>> {

        private final WebViewPersister persister;
        private final Consumer<List<Bundle>> callback;

        RestoreTabsTask(WebViewPersister persister, Consumer<List<Bundle>> callback) {
            this.persister = persister;
            this.callback = callback;
        }

        @Override
        protected List<Bundle> doInBackground(Void... voids) {
            return persister.loadTabsMetaData();
        }

        @Override
        protected void onPostExecute(List<Bundle> storedTabs) {
            callback.accept(storedTabs);
        }
    }
}

