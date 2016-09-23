package com.cliqz.browser.main;

import android.app.Activity;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;

import com.cliqz.browser.utils.Telemetry;
import com.cliqz.browser.webview.FavoritesWebView;
import com.cliqz.browser.webview.HistoryWebView;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Stefano Pacifici
 * @date 2015/11/23
 */
public class HistoryFragment extends FragmentWithBus {

    private static final String TAG = HistoryFragment.class.getSimpleName();
    public static final String SHOW_FAVORITES_ONLY = TAG + ".show_favorites_only";

    protected HistoryWebView mHistoryWebView;

    private boolean mJustCreated = false;
    private long startTime;
    boolean showFavorites = false;

    private void createWebView(Activity activity) {
        // Must use activity due to Crosswalk webview
        final Bundle args = getArguments();
        showFavorites = args != null ? args.getBoolean(SHOW_FAVORITES_ONLY, false): false;
        mHistoryWebView = showFavorites ? new FavoritesWebView(activity) : new HistoryWebView(activity);
        mHistoryWebView.setLayoutParams(
                new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
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
                //mHistoryWebView.fourceUpdateHistory();
                mHistoryWebView.isVisible();
            }
            mJustCreated = false;
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        telemetry.sendLayerChangeSignal("past");
        if( mHistoryWebView.isExtensionReady()) {
            final PreferenceManager.ClearQueriesOptions clear = preferenceManager.shouldClearQueries();
            if (clear != PreferenceManager.ClearQueriesOptions.NO) {
                mHistoryWebView.cleanupQueries(clear);
                preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.NO);
            }
        }
    }

//    @Subscribe
//    public void onNotifyQuery(CliqzMessages.NotifyQuery event) {
//        bus.post(new Messages.GoToSearch(event.query));
//    }

}
