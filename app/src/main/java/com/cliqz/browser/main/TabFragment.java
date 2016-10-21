package com.cliqz.browser.main;

import android.app.ActivityManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.res.TypedArray;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.support.annotation.Nullable;
import android.support.design.widget.AppBarLayout;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AlertDialog;
import android.util.Patterns;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.view.inputmethod.InputMethodManager;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.utils.TelemetryKeys;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.ExtensionEvents;
import com.cliqz.browser.webview.SearchWebView;
import com.cliqz.browser.widget.OverFlowMenu;
import com.cliqz.browser.widget.SearchBar;
import com.squareup.otto.Subscribe;

import org.json.JSONArray;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.AnimatedProgressBar;
import acr.browser.lightning.view.LightningView;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;
import butterknife.OnEditorAction;

/**
 * @author Stefano Pacifici
 * @date 2015/11/23
 */
public class TabFragment extends BaseFragment {

    private static final String TAG = TabFragment.class.getSimpleName();
    private static final String NAVIGATION_STATE_KEY = TAG + ".NAVIGATION_STATE";
    private int currentIcon;
    private boolean isAnimationInProgress = false;
    private OverFlowMenu mOverFlowMenu = null;
    private AntiTrackingDialog mAntiTrackingDialog = null;

    protected boolean isIncognito = false;

    private String mInitialUrl = null;
    private String mSearchEngine;
    private Message newTabMessage = null;
    private String mExternalQuery = null;
    // TODO: @Ravjit this should not be public (avoid public members)
    public final CliqzBrowserState state = new CliqzBrowserState();
    protected boolean isHomePageShown = false;
    private JSONArray videoUrls = null;
    private int mTrackerCount = 0;
    String lastQuery = "";

    SearchWebView mSearchWebView = null;
    protected LightningView mLightningView = null;
    private String mDelayedUrl = null;

    // A flag used to handle back button on old phones
    protected boolean mShowWebPageAgain = false;
    private boolean mRequestDesktopSite = false;

    @Bind(R.id.loading_screen)
    View loadingScreen;

    @Bind(R.id.local_container)
    FrameLayout localContainer;

    @Bind(R.id.progress_view)
    AnimatedProgressBar progressBar;

    @Bind(R.id.menu_overview)
    View menuHistory;

    @Bind(R.id.search_bar)
    SearchBar searchBar;

    @Bind(R.id.overflow_menu)
    View overflowMenuButton;

    @Bind(R.id.overflow_menu_icon)
    ImageView overflowMenuIcon;

    @Bind(R.id.in_page_search_bar)
    View inPageSearchBar;

    @Bind(R.id.open_tabs_count)
    TextView openTabsCounter;

    @Bind(R.id.toolbar_container)
    RelativeLayout toolBarContainer;

    @Inject
    OnBoardingHelper onBoardingHelper;

    @Override
    public void setArguments(Bundle args) {
        newTabMessage = args.getParcelable(Constants.KEY_NEW_TAB_MESSAGE);
        // Remove asap the message from the bundle
        args.remove(Constants.KEY_NEW_TAB_MESSAGE);
        final String url = args != null ? args.getString(Constants.KEY_URL) : null;
        if (url != null && !url.isEmpty()) {
            state.setUrl(url);
            state.setTitle(url);
            state.setMode(CliqzBrowserState.Mode.WEBPAGE);
        }
        super.setArguments(args);
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        if (arguments != null) {
            parseArguments(arguments);
        }
    }

    private void parseArguments(Bundle arguments) {
        isIncognito = arguments.getBoolean(Constants.KEY_IS_INCOGNITO, false);
        mInitialUrl = arguments.getString(Constants.KEY_URL, null);
        mExternalQuery = arguments.getString(Constants.KEY_QUERY);
        // We need to remove the key, otherwise the url/query/msg gets reloaded for each resume
        arguments.remove(Constants.KEY_URL);
        arguments.remove(Constants.KEY_NEW_TAB_MESSAGE);
        arguments.remove(Constants.KEY_QUERY);
    }

    @Override
    protected View onCreateContentView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_search, container, false);
    }

    @Override
    public void onViewCreated(View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ButterKnife.bind(this, view);
        openTabsCounter.setText(Integer.toString(((MainActivity) getActivity()).tabsManager.getTabCount()));
        final int iconColor = isIncognito ? R.color.toolbar_icon_color_incognito : R.color.toolbar_icon_color_normal;
        openTabsCounter.getBackground().setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        overflowMenuIcon.getDrawable().setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        openTabsCounter.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        inPageSearchBar.setVisibility(View.GONE);
        state.setIncognito(isIncognito);
        searchBar.setStyle(isIncognito);
        //openTabsCounter.setBa
        if (mSearchWebView == null || mLightningView == null) {
            // Must use activity due to Crosswalk webview
            mSearchWebView = ((MainActivity) getActivity()).searchWebView;
            mLightningView = new LightningView(getActivity()/*, mUrl */, isIncognito, "1");
            mSearchWebView.setLayoutParams(
                    new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        } else {
            final WebView webView = mLightningView.getWebView();
            ((ViewGroup) webView.getParent()).removeView(webView);
        }

        TabFragmentListener.create(this);
        final WebView webView = mLightningView.getWebView();
        webView.setId(R.id.right_drawer_list);
        if (savedInstanceState != null) {
            final Bundle webViewOutState = savedInstanceState.getBundle(NAVIGATION_STATE_KEY);
            if (webViewOutState != null) {
                webView.restoreState(webViewOutState);
            }
        }
        if (mSearchWebView.getParent() != null) {
            ((ViewGroup) mSearchWebView.getParent()).removeView(mSearchWebView);
        }
        mSearchWebView.setCurrentTabState(state);
        webView.setId(R.id.cliqz_web_view);
        mSearchWebView.setId(R.id.search_web_view);
        localContainer.addView(webView);
        localContainer.addView(mSearchWebView);
        mSearchWebView.initExtensionPreferences();
        searchBar.setTrackerCount(mTrackerCount);
    }


    @Override
    public void onStart() {
        super.onStart();
        final ActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        telemetry.sendLayerChangeSignal("present");
        if (mDelayedUrl != null) {
            openLink(mDelayedUrl, true, true);
            mDelayedUrl = null;
        } else if (!mSearchWebView.isExtensionReady()) {
            mSearchWebView.setVisibility(View.INVISIBLE);
            mLightningView.getWebView().setVisibility(View.INVISIBLE);
        }
    }

    @Override
    public void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        final WebView webView = mLightningView != null ? mLightningView.getWebView() : null;
        if (webView != null) {
            final Bundle webViewOutState = new Bundle();
            webView.saveState(webViewOutState);
            outState.putBundle(NAVIGATION_STATE_KEY, webViewOutState);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        final boolean extReady;
        if (mSearchWebView != null) {
            mSearchWebView.onResume();
            extReady = mSearchWebView.isExtensionReady();
            mSearchWebView.setVisibility(extReady ? View.VISIBLE : View.INVISIBLE);
            loadingScreen.setVisibility(extReady ? View.GONE : View.VISIBLE);
        } else {
            // By definition, if mSearchWebView is null the extension can't be ready
            extReady = false;
        }
        final WebView webView;
        if (mLightningView != null) {
            mLightningView.onResume();
            mLightningView.resumeTimers();
            webView = mLightningView.getWebView();
            webView.setVisibility(extReady ? View.VISIBLE : View.INVISIBLE);
        } else {
            webView = null;
        }

        searchBar.setIsAutocompletionEnabled(preferenceManager.getAutocompletionEnabled());

        if (state.shouldReset()) {
            isHomePageShown = true;
            searchBar.showSearchEditText();
            searchBar.setSearchText("");
            mSearchWebView.showHomepage();
            state.setShouldReset(false);
            return;
        }
        if (state.getMode() == Mode.SEARCH) {
            mSearchWebView.performSearch(state.getQuery());
        } else if (state.getMode() == Mode.WEBPAGE) {
            bringWebViewToFront();
        }
        // The code below shouldn't be executed if app is reset
        if (mInitialUrl != null && !mInitialUrl.isEmpty()) {
            state.setMode(Mode.WEBPAGE);
            bus.post(new CliqzMessages.OpenLink(mInitialUrl, true));
            mInitialUrl = null;
        } else if (newTabMessage != null && webView != null && newTabMessage.obj != null) {
            final WebView.WebViewTransport transport = (WebView.WebViewTransport) newTabMessage.obj;
            transport.setWebView(webView);
            newTabMessage.sendToTarget();
            newTabMessage = null;
            bringWebViewToFront();
        } else if (mExternalQuery != null && !mExternalQuery.isEmpty()) {
            state.setMode(Mode.SEARCH);
            bus.post(new Messages.ShowSearch(mExternalQuery));
        } else {
            // final boolean reset = System.currentTimeMillis() - state.getTimestamp() >= Constants.HOME_RESET_DELAY;
            final String lightningUrl = mLightningView.getUrl();
            final boolean mustShowSearch = lightningUrl == null || // Should never happens but just in case
                    lightningUrl.isEmpty();//  || // The url is empty
            if (mustShowSearch) {
                state.setMode(Mode.SEARCH);
            }
            final String query = state.getQuery();
            if (state.getMode() == Mode.SEARCH) {
                //showToolBar(null);
                delayedPostOnBus(new Messages.ShowSearch(query));
            } else {
                mLightningView.getWebView().bringToFront();
                searchBar.showTitleBar();
                searchBar.setAntiTrackingDetailsVisibility(View.VISIBLE);
                searchBar.setTitle(mLightningView.getTitle());
                searchBar.switchIcon(false);
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (mSearchWebView != null) {
            //mSearchWebView.onPause();
        }
        if (mLightningView != null) {
            mLightningView.onPause();
        }
    }

    @Override
    public void onDestroyView() {
        mLightningView.pauseTimers();
        //should we do this? if tab isn't opened for 30mins it gets reset
        //state.setTimestamp(System.currentTimeMillis());
        super.onDestroyView();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    @Override
    protected int getMenuResource() {
        return R.menu.fragment_search_menu;
    }

    @Override
    protected boolean onMenuItemClick(MenuItem item) {
        return false;
    }

    @Override
    protected int getFragmentTheme() {
        if (isIncognito) {
            return R.style.Theme_Cliqz_Present_Incognito;
        } else {
            return R.style.Theme_Cliqz_Overview;
        }
    }

    @Nullable
    @Override
    protected View onCreateCustomToolbarView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_search_toolbar, container, false);
    }

    @OnClick(R.id.menu_overview)
    void historyClicked() {
        hideKeyboard();
        telemetry.sendOverViewSignal(Integer.parseInt(openTabsCounter.getText().toString()),
                isIncognito, state.getMode());
        delayedPostOnBus(new Messages.GoToOverview());
    }

    @OnClick(R.id.overflow_menu)
    void menuClicked() {
        telemetry.sendOverflowMenuSignal(isIncognito, state.getMode() == Mode.SEARCH ? "cards" : "web");
        if (mOverFlowMenu != null && mOverFlowMenu.isShown()) {
            mOverFlowMenu.dismiss();
        } else {
            final String url = mLightningView != null ? mLightningView.getUrl() : "";
            mOverFlowMenu = new OverFlowMenu(getActivity());
            mOverFlowMenu.setCanGoForward(mLightningView.canGoForward());
            mOverFlowMenu.setAnchorView(overflowMenuButton);
            mOverFlowMenu.setIncognitoMode(isIncognito);
            mOverFlowMenu.setUrl(mLightningView.getUrl());
            mOverFlowMenu.setTitle(mLightningView.getTitle());
            mOverFlowMenu.setIsYoutubeVideo(videoUrls != null && videoUrls.length() > 0);
            mOverFlowMenu.setState(state);
            mOverFlowMenu.setDesktopSiteEnabled(mRequestDesktopSite);
            mOverFlowMenu.show();
            hideKeyboard();
        }
    }

    @OnClick(R.id.in_page_search_cancel_button)
    void closeInPageSearchClosed() {
        inPageSearchBar.setVisibility(View.GONE);
        mLightningView.findInPage("");
    }

    @OnClick(R.id.in_page_search_up_button)
    void previousResultInPageSearchClicked() {
        mLightningView.findPrevious();
    }

    @OnClick(R.id.in_page_search_down_button)
    void nextResultInPageSearchClicked() {
        mLightningView.findNext();
    }

    // TODO @Ravjit, the dialog should disappear if you pause the app
    @Nullable
    @OnClick(R.id.anti_tracking_details)
    void showAntiTrackingDialog() {
        telemetry.sendAntiTrackingOpenSignal(isIncognito, mTrackerCount);
        final ArrayList<TrackerDetailsModel> details = mLightningView.getTrackerDetails();
        mAntiTrackingDialog = new AntiTrackingDialog(getActivity(), isIncognito);
        mAntiTrackingDialog.show(searchBar);
        mAntiTrackingDialog.updateList(mTrackerCount, details);
    }

    @OnEditorAction(R.id.search_edit_text)
    boolean onEditorAction(EditText editText, int actionId, KeyEvent keyEvent) {
        // Navigate to autocomplete url or search otherwise
        if (keyEvent != null && keyEvent.getKeyCode() == KeyEvent.KEYCODE_ENTER
                && keyEvent.getAction() == KeyEvent.ACTION_DOWN) {
            final String content = searchBar.getSearchText();
            if (content != null && !content.isEmpty()) {
                final Object event;
                if (Patterns.WEB_URL.matcher(content).matches()) {
                    final String guessedUrl = URLUtil.guessUrl(content);
                    if (searchBar.isAutoCompleted()) {
                        telemetry.sendResultEnterSignal(false, true,
                                searchBar.getQuery().length(), guessedUrl.length());
                    } else {
                        telemetry.sendResultEnterSignal(false, false, content.length(), -1);
                    }
                    event = new CliqzMessages.OpenLink(guessedUrl);
                } else {
                    telemetry.sendResultEnterSignal(true, false, content.length(), -1);
                    setSearchEngine();
                    String searchUrl = mSearchEngine + UrlUtils.QUERY_PLACE_HOLDER;
                    event = new CliqzMessages.OpenLink(UrlUtils.smartUrlFilter(content, true, searchUrl));
                }
                if (!onBoardingHelper.conditionallyShowSearchDescription()) {
                    bus.post(event);
                } else {
                    hideKeyboard();
                    mSearchWebView.notifyEvent(ExtensionEvents.CLIQZ_EVENT_PERFORM_SHOWCASE_CARD_SWIPE);
                }
                return true;
            }
        }
        return false;
    }

    // Hide the keyboard, used also in SearchFragmentListener
    void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getActivity()
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(searchBar.getWindowToken(), 0);
        telemetry.sendKeyboardSinal(false, isIncognito,
                state.getMode() == Mode.SEARCH ? TelemetryKeys.CARDS : TelemetryKeys.WEB);
    }

    private void shareText(String text) {
        final String footer = getString(R.string.shared_using);
        final Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, new StringBuilder()
                .append(text)
                .append("\n")
                .append(footer)
                .toString()
        );
        startActivity(Intent.createChooser(intent, getString(R.string.share_link)));
    }

    @Subscribe
    public void updateProgress(BrowserEvents.UpdateProgress event) {
        progressBar.setProgress(event.progress);
        if (!mLightningView.getUrl().contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
            if (event.progress == 100) {
                searchBar.switchIcon(false);
                //Readjust the layout in cases when height of content is not more than the
                // visible content height + toolbar height
                AppBarLayout.LayoutParams params =
                        (AppBarLayout.LayoutParams) mToolbar.getLayoutParams();
                if (mLightningView.getWebView().getContentHeight() <= mLightningView.getWebView().getHeight()) {
                    params.setScrollFlags(0);
                    mContentContainer.requestLayout();
                } else if (params.getScrollFlags() == 0) {
                    params.setScrollFlags(AppBarLayout.LayoutParams.SCROLL_FLAG_SCROLL |
                            AppBarLayout.LayoutParams.SCROLL_FLAG_SNAP);
                    mContentContainer.requestLayout();
                }
            } else {
                searchBar.switchIcon(true);
            }
        }
    }

    @Subscribe
    public void updateTitle(Messages.UpdateTitle event) {
        updateTitle();
    }

    @Subscribe
    public void updateUrl(BrowserEvents.UpdateUrl event) {
        final String url = event.url;
        if (url != null && !url.isEmpty() && !url.startsWith(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
            state.setUrl(url);
        }
    }

    private void bringWebViewToFront() {
        final WebView webView = mLightningView.getWebView();
        searchBar.showTitleBar();
        searchBar.setAntiTrackingDetailsVisibility(View.VISIBLE);
        mLightningView.getWebView().bringToFront();
        state.setMode(Mode.WEBPAGE);
    }

    @Subscribe
    public void openLink(CliqzMessages.OpenLink event) {
        openLink(event.url, event.reset, false);
        mShowWebPageAgain = false;
    }

    @Subscribe
    public void addToFavourites(Messages.AddToFavourites event) {
        historyDatabase.setFavorites(event.url, event.title, System.currentTimeMillis(), true);
    }

    @Subscribe
    public void searchOnPage(BrowserEvents.SearchInPage event) {
        final Context context = getContext();
        final AlertDialog.Builder finder = new AlertDialog.Builder(context);
        finder.setTitle(getResources().getString(R.string.action_find));
        final EditText getHome = new EditText(context);
        getHome.setHint(getResources().getString(R.string.search_hint));
        finder.setView(getHome);
        finder.setPositiveButton(getResources().getString(R.string.search_hint),
                new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String query = getHome.getText().toString();
                        if (!query.isEmpty()) {
                            inPageSearchBar.setVisibility(View.VISIBLE);
                            mLightningView.findInPage(query);
                        }
                    }
                });
        finder.show();
    }

    public void openLink(String eventUrl, boolean reset, boolean fromHistory) {
        //if Request Desktop site is enabled, remove "m." if it is a mobile url
        if (mRequestDesktopSite && (eventUrl.startsWith("m.") || eventUrl.contains("/m."))) {
            eventUrl = eventUrl.replaceFirst("m.", "");
        }

        if (mLightningView == null) {
            mDelayedUrl = eventUrl;
            return;
        }
        if (telemetry != null) {
            telemetry.resetNavigationVariables(eventUrl.length());
        }

        new Uri.Builder();
        final Uri.Builder builder = new Uri.Builder();
        builder.scheme(TrampolineConstants.CLIQZ_SCHEME)
                .authority(TrampolineConstants.CLIQZ_TRAMPOLINE_AUTHORITY)
                .path(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO_PATH)
                .appendQueryParameter("url", eventUrl)
                .appendQueryParameter("q", lastQuery);
        if (reset) {
            builder.appendQueryParameter("r", "true");
        }
        if (fromHistory) {
            builder.appendQueryParameter("h", "true");
        }
        final String url = builder.build().toString();
        mLightningView.loadUrl(url);
        searchBar.setTitle(eventUrl);
        bringWebViewToFront();
    }

    /**
     * Show the search interface in the current tab for the given query
     *
     * @param query the query to display (and search)
     */
    public void searchQuery(String query) {
        searchBar.showSearchEditText();
        mSearchWebView.bringToFront();
        inPageSearchBar.setVisibility(View.GONE);
        mLightningView.findInPage("");
        searchBar.requestSearchFocus();
        if (query != null) {
            searchBar.setSearchText(query);
            searchBar.setSearchSelection(query.length());
        }
        state.setMode(Mode.SEARCH);
        searchBar.setAntiTrackingDetailsVisibility(View.GONE);
        searchBar.showKeyBoard();
    }

    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        // Due to webview bug (history manipulation doesn't work) we have to handle the back in a
        // different way.
        showToolbar();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
            onBackPressedV16();
        } else {
            onBackPressedV21();
        }
    }

    @Subscribe
    public void hideLoadingScreen(Messages.HideLoadingScreen event) {
        if (loadingScreen != null) {
            loadingScreen.setVisibility(View.GONE);
            mSearchWebView.setVisibility(View.VISIBLE);
            mLightningView.getWebView().setVisibility(View.VISIBLE);
            searchBar.requestSearchFocus();
            searchBar.showKeyBoard();
        }
    }

    private void onBackPressedV16() {
        final String url = mLightningView != null ? mLightningView.getUrl() : "";
        final Mode mode = state.getMode();
        if (onBoardingHelper.close()) {
            return;
        } else if (hideOverFlowMenu()) {
            return;
        } else if (mode == Mode.WEBPAGE && mLightningView.canGoBack()) {
            telemetry.backPressed = true;
            telemetry.showingCards = false;
            mLightningView.goBack();
            mShowWebPageAgain = false;
        } else if (mode == Mode.SEARCH && mShowWebPageAgain) {
            bringWebViewToFront();
        } else {
            bus.post(new BrowserEvents.CloseTab());
        }
    }

    private void onBackPressedV21() {
        final String url = mLightningView != null ? mLightningView.getUrl() : "";
        final Mode mode = state.getMode();
        if (onBoardingHelper.close()) {
            return;
        } else if (hideOverFlowMenu()) {
            return;
        } else if (mode == Mode.SEARCH &&
                !"".equals(url) &&
                !TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO.equals(url)) {
            bringWebViewToFront();
        } else if (mLightningView.canGoBack()) {
            // In any case the trampoline will be current page predecessor
            if (mode == Mode.SEARCH) {
                bringWebViewToFront();
            }
            telemetry.backPressed = true;
            telemetry.showingCards = mode == Mode.SEARCH;
            mLightningView.goBack();
        } else {
            bus.post(new BrowserEvents.CloseTab());
        }
    }

    // Hide the OverFlowMenu if it is visible. Return true if it was, false otherwise.
    private boolean hideOverFlowMenu() {
        if (mOverFlowMenu != null && mOverFlowMenu.isShown()) {
            mOverFlowMenu.dismiss();
            mOverFlowMenu = null;
            return true;
        }
        return false;
    }

    @Subscribe
    public void onGoForward(Messages.GoForward event) {
        if (mLightningView.canGoForward()) {
            mLightningView.goForward();
            if (state.getMode() == Mode.SEARCH) {
                bringWebViewToFront();
            }
        }
    }

    @Subscribe
    public void showSearch(Messages.ShowSearch event) {
        searchQuery(event.query);
    }

    @Subscribe
    public void autocomplete(CliqzMessages.Autocomplete event) {
        searchBar.setAutocompleteText(event.completion);
    }

    @Subscribe
    public void reloadPage(Messages.ReloadPage event) {
        mLightningView.getWebView().reload();
    }

    @Subscribe
    public void shareLink(Messages.ShareLink event) {
        if (state.getMode() == Mode.SEARCH) {
            mSearchWebView.requestCardUrl();
        } else {
            final String url = mLightningView.getUrl();
            shareText(url);
            telemetry.sendShareSignal("web");
        }
    }

    @Subscribe
    public void shareCard(Messages.ShareCard event) {
        final String url = event.url;
        if (url.equals("-1")) {
            Toast.makeText(getContext(), getString(R.string.not_shareable), Toast.LENGTH_SHORT).show();
        } else {
            shareText(url);
            telemetry.sendShareSignal("cards");
        }
    }

    @Subscribe
    public void copyUrl(Messages.CopyUrl event) {
        if (mLightningView.getWebView() != null) {
            final ClipboardManager clipboard = (ClipboardManager) getContext()
                    .getSystemService(Context.CLIPBOARD_SERVICE);
            final ClipData clip = ClipData.newPlainText("link", mLightningView.getUrl());
            clipboard.setPrimaryClip(clip);
        }
    }

    @Subscribe
    public void saveLink(Messages.SaveLink event) {
        Utils.downloadFile(getActivity(), mLightningView.getUrl(),
                mLightningView.getWebView().getSettings().getUserAgentString(), "attachment", false);
    }

    @Subscribe
    public void copyData(CliqzMessages.CopyData event) {
        final String message = getResources().getString(R.string.message_text_copied);
        final ClipboardManager clipboard = (ClipboardManager) getContext()
                .getSystemService(Context.CLIPBOARD_SERVICE);
        final ClipData clip = ClipData.newPlainText("result", event.data);
        clipboard.setPrimaryClip(clip);
        Toast.makeText(getContext(), message, Toast.LENGTH_SHORT).show();
    }

    @Subscribe
    public void setYoutubeUrls(Messages.SetVideoUrls event) {
        videoUrls = event.urls;
        if (videoUrls == null) {
            return;
        }
        if (videoUrls.length() == 0) {
            telemetry.sendVideoPageSignal(false);
        } else {
            telemetry.sendVideoPageSignal(true);
        }
    }

    @Subscribe
    public void fetchYoutubeVideo(Messages.FetchYoutubeVideoUrls event) {
        videoUrls = null;
        // To fetch the videos url we have to run the ytdownloader.getUrls script that is bundled
        // with the extension
        final String url =
                event.videoPageUrl != null ? event.videoPageUrl : mLightningView.getUrl();
        YTPageFetcher.asyncGetYoutubeVideoUrls(mSearchWebView, url);
    }

    @Subscribe
    public void downloadYoutubeVideo(Messages.DownloadYoutubeVideo event) {
        if (videoUrls != null) {
            YTDownloadDialog.show(getActivity(), videoUrls, telemetry);
        }
    }

    @Subscribe
    public void updateTrackerCount(Messages.UpdateTrackerCount event) {
        mTrackerCount++;
        searchBar.setTrackerCount(mTrackerCount);
        if (mTrackerCount > 0) {
            onBoardingHelper.conditionallyShowAntiTrackingDescription();
            hideKeyboard();
        }
        if (mAntiTrackingDialog != null && mAntiTrackingDialog.isShowing()) {
            mAntiTrackingDialog.updateList(mTrackerCount, mLightningView.getTrackerDetails());
        }
    }

    @Subscribe
    public void resetTrackerCount(Messages.ResetTrackerCount event) {
        mTrackerCount = 0;
        searchBar.setTrackerCount(mTrackerCount);
    }

    @Subscribe
    public void updateTabCounter(Messages.UpdateTabCounter event) {
        openTabsCounter.setText(Integer.toString(event.count));
    }

    @Subscribe
    public void updateUserAgent(Messages.ChangeUserAgent event) {
        if (mLightningView != null && mLightningView.getWebView() != null
                && mLightningView.getWebView().getSettings() != null) {
            mLightningView.getWebView().getSettings()
                    .setUserAgentString(event.isDesktopSiteEnabled ?
                            Constants.DESKTOP_USER_AGENT : WebSettings.getDefaultUserAgent(getContext()));
        }
        if (event.isDesktopSiteEnabled
                && mLightningView.getWebView() != null
                && mLightningView.getWebView().getUrl() != null
                && (mLightningView.getWebView().getUrl().startsWith("m.")
                || mLightningView.getWebView().getUrl().contains("/m."))) {
            mLightningView.getWebView().loadUrl(mLightningView.getWebView().getUrl().replaceFirst("m.", ""));
        } else {
            mLightningView.getWebView().reload();
        }
        mRequestDesktopSite = event.isDesktopSiteEnabled;
    }

    void updateTitle() {
        final String title = mLightningView.getTitle();
        searchBar.setTitle(title);
        state.setTitle(title);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            final int taskBarColor = isIncognito ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
            final Bitmap appIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            final ActivityManager.TaskDescription taskDescription = new ActivityManager.TaskDescription(
                    title, appIcon, ContextCompat.getColor(getContext(), taskBarColor));
            getActivity().setTaskDescription(taskDescription);
        }
    }

    private void setSearchEngine() {
        mSearchEngine = preferenceManager.getSearchChoice().engineUrl;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (mAntiTrackingDialog != null && mAntiTrackingDialog.isShowing()) {
            mAntiTrackingDialog.onConfigurationChanged(newConfig);
        }
    }

    @Nullable
    public Bitmap getFavicon() {
        return mLightningView != null ? mLightningView.getFavicon() : null;
    }

    public void findInPage(String query) {
        if (mLightningView != null) {
            mLightningView.findInPage(query);
        }
    }

    public String getPageTitle() {
        return mLightningView != null ? mLightningView.getTitle() : "";
    }

    @Subscribe
    public void switchToForgetMode(Messages.SwitchToForget event) {
        isIncognito = true;
        state.setIncognito(true);
        mLightningView.setIsIncognitoTab(true);
        mLightningView.setIsAutoForgetTab(true);
        updateUI();
        mSearchWebView.initExtensionPreferences();
    }

    @Subscribe
    public void switchToNormalMode(Messages.SwitchToNormalTab event) {
        isIncognito = false;
        state.setIncognito(false);
        mLightningView.setIsIncognitoTab(false);
        mLightningView.setIsAutoForgetTab(false);
        updateUI();
        mSearchWebView.initExtensionPreferences();
    }

    @Subscribe
    public void showToolBar(BrowserEvents.ShowToolBar event) {
        showToolbar();
    }

    private void updateUI() {
        final int iconColor = isIncognito ? R.color.toolbar_icon_color_incognito : R.color.toolbar_icon_color_normal;
        final int toolBarColor = isIncognito ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
        openTabsCounter.getBackground().setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        overflowMenuIcon.getDrawable().setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        openTabsCounter.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        toolBarContainer.setBackgroundColor(ContextCompat.getColor(getContext(), toolBarColor));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            final TypedArray typedArray = getActivity().getTheme().obtainStyledAttributes(getFragmentTheme(), new int[]{R.attr.colorPrimaryDark});
            final int resourceId = typedArray.getResourceId(0, R.color.normal_tab_primary_color);
            getActivity().getWindow().setStatusBarColor(ContextCompat.getColor(getContext(), resourceId));
            typedArray.recycle();
        }
    }
}
