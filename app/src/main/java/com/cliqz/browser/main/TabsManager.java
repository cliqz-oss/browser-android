package com.cliqz.browser.main;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.os.AsyncTask;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.webkit.WebSettings;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.WebViewPersister;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;

import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.download.LightningDownloadListener;
import acr.browser.lightning.view.CliqzWebView;
import acr.browser.lightning.view.LightningView;
import acr.browser.lightning.view.TrampolineConstants;

import static android.os.Build.VERSION.SDK_INT;
import static android.os.Build.VERSION_CODES.JELLY_BEAN;
import static android.os.Build.VERSION_CODES.JELLY_BEAN_MR1;
import static android.os.Build.VERSION_CODES.JELLY_BEAN_MR2;
import static android.os.Build.VERSION_CODES.KITKAT;
import static android.os.Build.VERSION_CODES.LOLLIPOP;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
public class TabsManager {

    public class Builder {
        private boolean mWasCreated = false;
        private boolean mForgetMode = false;
        private String mUrl = null;
        private String mQuery = null;
        private Message mMessage = null;
        private String mId = null;
        private String mTitle = "";
        private boolean mRestore = false;
        private boolean mOpenVpnPanel = false;

        private Builder() {}

        public Builder setForgetMode(boolean value) {
            mForgetMode = value;
            return this;
        }

        @SuppressWarnings({"unused", "WeakerAccess"})
        public Builder setOriginTab(TabFragment2 from) {
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

        public int create() {
            if (mWasCreated) {
                throw new RuntimeException("Can't use the same builder twice");
            }
            mWasCreated = true;

            final TabFragment2 newTab = new TabFragment2();
            final Bundle arguments = new Bundle();
            arguments.putBoolean(MainActivity.EXTRA_IS_PRIVATE, mForgetMode);
            arguments.putBoolean(TabFragment2.KEY_OPEN_VPN_PANEL, mOpenVpnPanel);
            if (mUrl != null) {
                arguments.putString(TabFragment2.KEY_URL, mUrl);
            }
            if (mQuery != null) {
                arguments.putString(TabFragment2.KEY_QUERY, mQuery);
            }
            if (mMessage != null) {
                arguments.putParcelable(TabFragment2.KEY_NEW_TAB_MESSAGE, mMessage);
            }

            if (mId != null) {
                arguments.putString(TabFragment2.KEY_TAB_ID, mId);
            }
            arguments.putBoolean(TabFragment2.KEY_FORCE_RESTORE, mRestore);

            if (mTitle != null) {
                arguments.putString(TabFragment2.KEY_TITLE, mTitle);
            }
            newTab.setArguments(arguments);
            final int position = mFragmentsList.size();
            final TabData tabData = new TabData();
            tabData.fragment = newTab;
            mFragmentsList.add(tabData);
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

    private static final class TabData {
        TabFragment2 fragment = null;
        CliqzWebView webView = null;
    }

    private final List<TabData> mFragmentsList = new ArrayList<>();
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
    public TabFragment2 getCurrentTab() {
        if (getCurrentTabPosition() == -1) {
            return null;
        } else {
            return mFragmentsList.get(getCurrentTabPosition()).fragment;
        }
    }

    /**
     * @return Returns the tabfragment at the required position
     */
    public TabFragment2 getTab(int position) {
        return mFragmentsList.get(position).fragment;
    }

    /**
     * @param position the tab position
     * @return the tab id
     */
    @SuppressWarnings("WeakerAccess")
    @NonNull
    public String getTabId(int position) {
        return mFragmentsList.get(position).fragment.getTabId();
    }

    /**
     * @param lightningView the lightning view associated with the tab
     * @return the tab id, or null if the tab was removed before this call
     */
    @Nullable
    public String getTabId(@NonNull LightningView lightningView) {
        final int position = findTabFor(lightningView);
        return position >= 0 ? getTabId(position) : null;
    }

    /**
     * Method to switch between Tabs
     *
     * @param position Position of the tab to switch to
     */
    public void showTab(int position) {
        showTab(position, 0);
    }

    /**
     * Method to switch between Tabs with an animation
     *
     * @param position Position of the tab to switch to
     * @param animation Animation for the enter transition
     */
    public void showTab(int position, int animation) {
        final TabFragment2 currentTab = getCurrentTab();
        if (currentTab != null) {
            currentTab.state.setSelected(false);
        }
        final TabFragment2 tab = mFragmentsList.get(position).fragment;
        tab.state.setSelected(true);
        currentVisibleTab = position;
        persister.visit(tab.getTabId());
        if (mFragmentManager.isDestroyed()) {
            // Do not perform the transaction, the Activity is destroyed
            return;
        }
        final FragmentTransaction transaction = mFragmentManager.beginTransaction();
        if (SDK_INT != Build.VERSION_CODES.M && animation != 0) {
            //cannot pass null for exit animation
            transaction.setCustomAnimations(animation, R.anim.dummy_transition);
        }
        transaction.replace(R.id.content_frame, tab, MainActivity.TAB_FRAGMENT_TAG);
        if (mFragmentManager.isStateSaved()) {
            // Only on exceptional cases
            transaction.commitAllowingStateLoss();
        } else {
            transaction.commit();
        }
    }

    /**
     * Create a new {@link Builder}
     *
     * @return the new {@link Builder}
     */
    public Builder buildTab() {
        return new Builder();
    }

    public CliqzWebView restoreTab(@NonNull LightningView lightningView, @NonNull String tabId) {
        final int index = findTabFor(lightningView);
        if (index == -1) {
            // This is technically an error but we are still able to recover in this case
            final CliqzWebView webView = createWebView(lightningView.getContext(), lightningView.isIncognitoTab());
            persister.restore(tabId, webView);
            return webView;
        }
        final TabData tabData = mFragmentsList.get(index);
        if (tabData.webView == null) {
            tabData.webView = createWebView(lightningView.getContext(), lightningView.isIncognitoTab());
            persister.restore(tabId, tabData.webView);
        }
        return tabData.webView;
    }

    /**
     * Create a CliqzWebView.
     *
     * @return always return a fully configured CliqzWebView
     */
    @NonNull
    private static CliqzWebView createWebView(@NonNull Context context, boolean isIncognito) {
        final CliqzWebView cliqzWebView = new CliqzWebView(context);
        cliqzWebView.setDrawingCacheBackgroundColor(Color.WHITE);
        cliqzWebView.setFocusableInTouchMode(true);
        cliqzWebView.setFocusable(true);
        cliqzWebView.setDrawingCacheEnabled(false);
        cliqzWebView.setWillNotCacheDrawing(true);

        if (SDK_INT <= Build.VERSION_CODES.LOLLIPOP_MR1) {
            cliqzWebView.setAnimationCacheEnabled(false);
            cliqzWebView.setAlwaysDrawnWithCacheEnabled(false);
        }
        cliqzWebView.setBackgroundColor(Color.WHITE);

        cliqzWebView.setSaveEnabled(true);
        cliqzWebView.setNetworkAvailable(true);
        cliqzWebView.setDownloadListener(new LightningDownloadListener(context));
        initializeSettings(cliqzWebView.getSettings(), context, isIncognito);
        return cliqzWebView;
    }

    /**
     * Initialize the settings of the WebView that are intrinsic to Lightning and cannot
     * be altered by the user. Distinguish between Incognito and Regular tabs here.
     *
     * @param settings the WebSettings object to use.
     * @param context  the Context which was used to construct the WebView.
     */
    @SuppressLint({"NewApi", "ObsoleteSdkInt"})
    private static void initializeSettings(WebSettings settings, Context context, boolean isIncognito) {
        if (SDK_INT < JELLY_BEAN_MR2) {
            //noinspection deprecation
            settings.setAppCacheMaxSize(Long.MAX_VALUE);
        }
        if (SDK_INT < JELLY_BEAN_MR1) {
            //noinspection deprecation
            settings.setEnableSmoothTransition(true);
        }
        if (SDK_INT > JELLY_BEAN) {
            settings.setMediaPlaybackRequiresUserGesture(true);
        }
        if (SDK_INT >= LOLLIPOP && !isIncognito) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        } else if (SDK_INT >= LOLLIPOP) {
            // We're in Incognito mode, reject
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        if (!isIncognito) {
            settings.setDomStorageEnabled(true);
            settings.setAppCacheEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setDatabaseEnabled(true);
        } else {
            settings.setDomStorageEnabled(false);
            settings.setAppCacheEnabled(false);
            settings.setDatabaseEnabled(false);
            settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        }
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(true);
        settings.setDefaultTextEncodingName("utf-8");
        // setAccessFromUrl(urlView, settings);
        if (SDK_INT >= JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(false);
            settings.setAllowUniversalAccessFromFileURLs(false);
        }

        settings.setAppCachePath(context.getDir("appcache", 0).getPath());
        settings.setGeolocationDatabasePath(context.getDir("geolocation", 0).getPath());
        if (SDK_INT < KITKAT) {
            //noinspection deprecation
            settings.setDatabasePath(context.getDir("databases", 0).getPath());
        }
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
            final TabFragment2 tab = mFragmentsList.get(i).fragment;
            if (tab != null && tab.getLightningView() == view) {
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

        final TabFragment2 reference = mFragmentsList.get(position).fragment;
        if (reference == null) {
            return;
        }
        mFragmentsList.remove(position);
        persister.remove(reference.getTabId());
        reference.onDeleteTab();
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
        for (TabData tabData : mFragmentsList) {
            tabData.fragment.onDeleteTab();
            persister.remove(tabData.fragment.getTabId());
        }

        mFragmentsList.clear();
        currentVisibleTab = 0;
        buildTab().show();
    }

    void pauseAllTabs() {
        for (TabData tabData : mFragmentsList) {
            tabData.fragment.onPauseTab();
        }
    }

    void resumeAllTabs() {
        for (TabData tabData : mFragmentsList) {
            tabData.fragment.onResumeTab();
        }
    }

    /**
     * Delete all the stored tabs data, use this one if you do not want to create a new empty tab.
     */
    void clearTabsData() {
        persister.clearTabsData();
    }

    boolean restoreTabs(List<Bundle> storedTabs) {
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

    public static class RestoreTabsTask extends AsyncTask<Void, Void, List<Bundle>> {

        private final WebViewPersister mPersister;

        private final Bus mBus;

        RestoreTabsTask(WebViewPersister persister, Bus bus) {
            this.mPersister = persister;
            this.mBus = bus;
        }

        @Override
        protected List<Bundle> doInBackground(Void... voids) {
            return mPersister.loadTabsMetaData();
        }

        @Override
        protected void onPostExecute(List<Bundle> storedTabs) {
            mBus.post(new CliqzMessages.RestoreTabs(storedTabs));
        }
    }
}

