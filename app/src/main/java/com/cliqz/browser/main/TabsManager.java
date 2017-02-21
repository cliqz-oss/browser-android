package com.cliqz.browser.main;

import android.content.Context;
import android.os.Bundle;
import android.os.Message;
import android.os.Parcel;
import android.support.annotation.NonNull;
import android.support.v4.app.FragmentManager;
import android.util.Log;
import android.webkit.WebView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.view.LightningView;

/**
 * @author Ravjit Singh
 */
public class TabsManager {

    public class Builder {
        private boolean mWasCreated = false;
        private boolean mForgetMode = false;
        private TabFragment mFromTab = null;
        private String mUrl = null;
        private String mQuery = null;
        private Message mMessage = null;
        private Bundle mSavedState = null;

        private Builder() {}

        public Builder setForgetMode(boolean value) {
            mForgetMode = value;
            return this;
        }

        @SuppressWarnings("WeakerAccess")
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

        public Builder setState(Bundle bundle) {
            mSavedState = bundle;
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
            if (mSavedState != null) {
                arguments.putBundle(Constants.SAVED_STATE_BUNDLE, mSavedState);
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
    private Context mContext;

    @Inject
    Telemetry telemetry;

    @Inject
    Bus bus;

    public TabsManager(Context context, FragmentManager fragmentManager) {
        mFragmentManager = fragmentManager;
        mContext = context;
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
        return 0;
    }

    /**
     * @return The instance of currently visible Tab
     */
    public TabFragment getCurrentTab() {
        if (mFragmentsList.isEmpty()) {
            return null;
        } else {
            return mFragmentsList.get(0);
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
    public synchronized void showTab(int position) {
        if (position < 0 || position >= mFragmentsList.size()) {
            return;
        }
        final TabFragment tab = mFragmentsList.remove(position);
        mFragmentsList.add(0, tab);
        mFragmentManager.beginTransaction()
                .replace(R.id.content_frame, tab, MainActivity.TAB_FRAGMENT_TAG)
                .commit();
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
        if (position < 0 || position >= mFragmentsList.size()) {
            return;
        }

        TabFragment reference = mFragmentsList.remove(position);
        if (reference == null) {
            return;
        }
        if (reference.mLightningView != null) {
            reference.mLightningView.onDestroy();
        }
        if (mFragmentsList.size() == 0) {
            buildTab().show();
        }
    }


    void pauseAllTabs() {
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

    void resumeAllTabs() {
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

    void setShouldReset(boolean shouldReset) {
        for (TabFragment tabFragment : mFragmentsList) {
            tabFragment.state.setShouldReset(shouldReset);
        }
    }

    ArrayList<Bundle> saveState() {
        final ArrayList<Bundle> states = new ArrayList<>();
        for (int i = 0; i < getTabCount(); i++) {
            final Bundle bundle = new Bundle();
            final Bundle saveState = new Bundle();
            final TabFragment tab = getTab(i);
            final WebView webView = tab.mLightningView != null ? tab.mLightningView.getWebView() : null;
            if (webView != null) {
                webView.saveState(saveState);
                writeBundleToStorage(saveState, Constants.BUNDLE_PREFIX+i);
                bundle.putString(Constants.SAVED_STATE_BUNDLE, Constants.BUNDLE_PREFIX+i);
            } else if (tab.getArguments().getBundle(Constants.SAVED_STATE_BUNDLE) != null) {
                //case for saving the state of a tab which had a backforward list but was never shown.
                // It's saved state exists in the bundle
                writeBundleToStorage(tab.getArguments().getBundle(Constants.SAVED_STATE_BUNDLE),
                        Constants.BUNDLE_PREFIX+i);
                bundle.putString(Constants.SAVED_STATE_BUNDLE, Constants.BUNDLE_PREFIX+i);
            }
            bundle.putString(Constants.SAVED_URL, tab.state.getUrl());
            bundle.putString(Constants.SAVED_TITLE, tab.state.getTitle());
            bundle.putBoolean(Constants.KEY_IS_INCOGNITO, tab.state.isIncognito());
            states.add(bundle);
        }
        return states;
    }

    void restoreTabs(Bundle savedInstanceState) {
        final ArrayList<Bundle> states = savedInstanceState.getParcelableArrayList(Constants.SAVED_STATES);
        if (states == null || states.isEmpty()) {
            return;
        }
        for (int i = 0; i < states.size(); i++) {
            final Bundle bundle = states.get(i);
            final Bundle savedState = readBundleFromStorage(bundle.getString(Constants.SAVED_STATE_BUNDLE));
            final String url = bundle.getString(Constants.SAVED_URL);
            final Builder tabBuilder = buildTab().setState(savedState)
                    .setForgetMode(bundle.getBoolean(Constants.KEY_IS_INCOGNITO))
                    .setUrl(url);
            final int position;
            if (i == 0) {
                position = tabBuilder.show();
            } else {
                position = tabBuilder.create();
            }
            getTab(position).state.setUrl(url);
            getTab(position).state.setTitle(bundle.getString(Constants.SAVED_TITLE));
        }
    }

    private void writeBundleToStorage(final Bundle bundle, final @NonNull String name) {
        final File outputFile = new File(mContext.getFilesDir(), name);
        try {
            final FileOutputStream outputStream = new FileOutputStream(outputFile);
            final Parcel parcel = Parcel.obtain();
            parcel.writeBundle(bundle);
            outputStream.write(parcel.marshall());
            outputStream.flush();
            parcel.recycle();
            outputStream.close();
        } catch (IOException e) {
            Log.e(Constants.TAG, "Unable to write bundle to storage");
        }
    }

    private Bundle readBundleFromStorage(final String name) {
        if (name == null) {
            return null;
        }
        final File inputFile = new File(mContext.getFilesDir(), name);
        try {
            final FileInputStream inputStream = new FileInputStream(inputFile);
            final Parcel parcel = Parcel.obtain();
            final byte[] data = new byte[(int) inputStream.getChannel().size()];
            //noinspection ResultOfMethodCallIgnored
            inputStream.read(data, 0, data.length);
            parcel.unmarshall(data, 0, data.length);
            parcel.setDataPosition(0);
            Bundle out = parcel.readBundle(ClassLoader.getSystemClassLoader());
            out.putAll(out);
            parcel.recycle();
            inputStream.close();
            return out;
        } catch (FileNotFoundException e) {
            Log.e(Constants.TAG, "Unable to read bundle from storage");
        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            //noinspection ResultOfMethodCallIgnored
            inputFile.delete();
        }
        return null;
    }

}

