package com.cliqz.browser.main;

import android.animation.Animator;
import android.app.ActivityManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.PorterDuff;
import android.graphics.drawable.ColorDrawable;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.support.annotation.Nullable;
import android.support.v4.content.ContextCompat;
import android.support.v7.app.AlertDialog;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Patterns;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.view.WindowManager;
import android.view.animation.AccelerateInterpolator;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.TextView;
import android.widget.Toast;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.utils.CustomChooserIntent;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.webview.SearchWebView;
import com.cliqz.browser.widget.AutocompleteEditText;
import com.cliqz.browser.widget.OverFlowMenu;
import com.cliqz.browser.widget.SearchBar;
import com.squareup.otto.Subscribe;

import org.json.JSONArray;

import java.util.ArrayList;
import java.util.Locale;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.ThemeUtils;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.AnimatedProgressBar;
import acr.browser.lightning.view.CliqzWebView;
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

    private static final String antiTrackingHelpUrlDe = "https://cliqz.com/whycliqz/anti-tracking";
    private static final String antiTrackingHelpUrlEn = "https://cliqz.com/en/whycliqz/anti-tracking";
    private static final String TAG = TabFragment.class.getSimpleName();
    private static final String NAVIGATION_STATE_KEY = TAG + ".NAVIGATION_STATE";
    private static final int ICON_STATE_CLEAR = 0;
    //private static final int RELOAD = 1;
    private static final int ICON_STATE_STOP = 2;
    private static final int ICON_STATE_NONE = 3;
    private int currentIcon;
    private boolean isAnimationInProgress = false;
    private OverFlowMenu mOverFlowMenu = null;
    private boolean isIncognito = false;

    private String mInitialUrl = null;
    private String mSearchEngine;
    private Message newTabMessage = null;
    private String mExternalQuery = null;
    // TODO: @Ravjit this should not be public (avoid public members)
    public final CliqzBrowserState state = new CliqzBrowserState();
    protected boolean isHomePageShown = false;
    private JSONArray videoUrls = null;
    private int mTrackerCount = 0;
    private View loadingScreen;

    String lastQuery = "";

    SearchWebView mSearchWebView = null;
    protected LightningView mLightningView = null;

    // A flag used to handle back button on old phones
    private boolean mShowWebPageAgain = false;

    @Bind(R.id.local_container)
    FrameLayout mLocalContainer;

    @Bind(R.id.progress_view)
    AnimatedProgressBar mProgressBar;

    @Bind(R.id.menu_history)
    View mMenuHistory;

    @Bind(R.id.search_bar)
    SearchBar searchBar;

    @Bind(R.id.search_edit_text)
    AutocompleteEditText mAutocompleteEditText;

    @Bind(R.id.title_bar)
    TextView titleBar;

    @Bind(R.id.overflow_menu)
    View overflowMenuButton;

    @Bind(R.id.overflow_menu_icon)
    ImageView overflowMenuIcon;

    @Bind(R.id.in_page_search_bar)
    View inPageSearchBar;

    @Nullable
    @Bind(R.id.tracker_counter)
    TextView trackerCounter;

    @Nullable
    @Bind(R.id.anti_tracking_details)
    LinearLayout antiTrackingDetails;

    @Bind(R.id.open_tabs_count)
    TextView openTabsCounter;

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
        if (arguments.getBoolean(Constants.KEY_NEW_TAB_MESSAGE, false)) {
            newTabMessage = BrowserApp.popNewTabMessage();
        }
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
        openTabsCounter.setText(Integer.toString(((MainActivity)getActivity()).tabsManager.getTabCount()));
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
            mSearchWebView = ((MainActivity)getActivity()).searchWebView;
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
        mLocalContainer.addView(webView);
        mLocalContainer.addView(mSearchWebView);
        titleBar.setOnTouchListener(onTouchListener);
        mSearchWebView.initExtensionPreferences();
        setTrackerCountText(Integer.toString(mTrackerCount));
    }

    @Override
    public void onActivityCreated(@Nullable Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        telemetry.sendLayerChangeSignal("present");
        if (!mSearchWebView.isExtensionReady()) {
            final LayoutInflater inflater = LayoutInflater.from(getContext());
            loadingScreen = inflater.inflate(R.layout.loading_screen, null, false);
            mLocalContainer.addView(loadingScreen);
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
        if (mSearchWebView != null) {
            mSearchWebView.onResume();
        }
        final WebView webView;
        if (mLightningView != null) {
            mLightningView.onResume();
            mLightningView.resumeTimers();
            webView = mLightningView.getWebView();
        } else {
            webView = null;
        }

        if (state.shouldReset()) {
            isHomePageShown = true;
            searchBar.showSearchEditText();
            mAutocompleteEditText.setText("");
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
                showToolBar(null);
                bus.post(new Messages.ShowSearch(query));
            } else {
                mLightningView.getWebView().bringToFront();
                searchBar.showTitleBar();
                setAntiTrackingDetailsVisibility(View.VISIBLE);
                searchBar.setTitle(mLightningView.getTitle());
                switchIcon(ICON_STATE_NONE);
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
        /* This code was removed because settings are now in the "PAST"
        switch (item.getItemId()) {
            case R.id.menu_settings:
                hideKeyboard();
                delayedPostOnBus(new Messages.GoToSettings());
                return true;
            default:
                return false;
        }
        */
        return false;
    }

    @Override
    protected int getFragmentTheme() {
        if(isIncognito) {
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

    @OnClick(R.id.menu_history)
    void historyClicked() {
        hideKeyboard();
        delayedPostOnBus(new Messages.GoToOverview());
    }

    @OnClick(R.id.title_bar)
    void titleClicked() {
        setAntiTrackingDetailsVisibility(View.GONE);
        searchBar.showSearchEditText();
        mAutocompleteEditText.setText(mLightningView.getUrl());
        mAutocompleteEditText.requestFocus();
        showKeyBoard();
        mShowWebPageAgain = true;
    }

    @OnClick(R.id.overflow_menu)
    void menuClicked() {
        if (mOverFlowMenu != null && mOverFlowMenu.isShown()) {
            mOverFlowMenu.dismiss();
        } else {
            final String url = mLightningView != null ? mLightningView.getUrl() : "";
            mOverFlowMenu = new OverFlowMenu(getActivity());
            mOverFlowMenu.setCanGoForward(mLightningView.canGoForward());
            mOverFlowMenu.setAnchorView(overflowMenuButton);
            mOverFlowMenu.setIncognitoMode(isIncognito);
            mOverFlowMenu.setUrl(mLightningView.getUrl());
            mOverFlowMenu.setIsYoutubeVideo(videoUrls != null && videoUrls.length() > 0);
            mOverFlowMenu.setState(state);
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

    // TODO @Ravjit, please extraxt this as a class, it is too much convoluted
    // TODO @Ravjit, the dialog should disappear if you pause the app
    @Nullable
    @OnClick(R.id.anti_tracking_details)
    void showAntiTrackingDialog() {
        final ArrayList<TrackerDetailsModel> details = mLightningView.getTrackerDetails();
        int trackerPoints = 0;
        for (TrackerDetailsModel model: details) {
            trackerPoints += model.trackerCount;
        }
        final int othersCount = mTrackerCount - trackerPoints;
        if (othersCount > 0) {
            final TrackerDetailsModel othersEntry = new TrackerDetailsModel(getString(R.string.others), othersCount);
            details.add(othersEntry);
        }
        final View popupView = getActivity().getLayoutInflater().inflate(R.layout.anti_tracking_dialog, null);
        final int popupBgColor = isIncognito ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
        final int popupTextColor = isIncognito ? R.color.normal_tab_primary_color : R.color.incognito_tab_primary_color;
        popupView.setBackgroundColor(ContextCompat.getColor(getContext(), popupBgColor));
        popupView.setAlpha(0.95f);
        final PopupWindow antiTrackindDialog = new PopupWindow(popupView, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT);
        final TextView counter = (TextView) popupView.findViewById(R.id.counter);
        final RecyclerView trackersList = (RecyclerView) popupView.findViewById(R.id.trackers_list);
        final Button helpButton = (Button) popupView.findViewById(R.id.help);
        final TextView companiesHeader = (TextView) popupView.findViewById(R.id.companies_header);
        final TextView counterHeader = (TextView) popupView.findViewById(R.id.counter_header);
        final View upperLine = popupView.findViewById(R.id.upperLine);
        final View lowerLine = popupView.findViewById(R.id.lowerLine);
        helpButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                final Bundle args = new Bundle();
                final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                        antiTrackingHelpUrlDe : antiTrackingHelpUrlEn;
                args.putString(Constants.KEY_URL, helpUrl);
                ((MainActivity)getActivity()).tabsManager.addNewTab(args);
                antiTrackindDialog.dismiss();
            }
        });
        companiesHeader.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        counterHeader.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        counter.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        helpButton.setTextColor(ContextCompat.getColor(getContext(), popupBgColor));
        helpButton.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        upperLine.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        lowerLine.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        counter.setText(Integer.toString(mTrackerCount));
        trackersList.setLayoutManager(new LinearLayoutManager(getContext()));
        trackersList.setAdapter(new TrackersListAdapter(details, isIncognito, getContext(), bus, antiTrackindDialog));
        antiTrackindDialog.setBackgroundDrawable(new ColorDrawable());
        antiTrackindDialog.setOutsideTouchable(true);
        antiTrackindDialog.setFocusable(true);
        antiTrackindDialog.showAsDropDown(searchBar);
    }

    @OnEditorAction(R.id.search_edit_text)
    boolean onEditorAction(int actionId) {
        // Navigate to autocomplete url or search otherwise
        if ((actionId & EditorInfo.IME_MASK_ACTION) == EditorInfo.IME_ACTION_UNSPECIFIED) {
            final String content = mAutocompleteEditText.getText().toString();
            if (content != null && !content.isEmpty()) {
                if (Patterns.WEB_URL.matcher(content).matches()) {
                    final String guessedUrl = URLUtil.guessUrl(content);
                    if (mAutocompleteEditText.isAutocompleted()) {
                        telemetry.sendResultEnterSignal(false, true,
                                mAutocompleteEditText.getQuery().length(), guessedUrl.length());
                    } else {
                        telemetry.sendResultEnterSignal(false, false, content.length(), -1);
                    }
                    bus.post(new CliqzMessages.OpenLink(guessedUrl));
                } else {
                    telemetry.sendResultEnterSignal(true, false, content.length(), -1);
                    setSearchEngine();
                    String searchUrl = mSearchEngine + UrlUtils.QUERY_PLACE_HOLDER;
                    bus.post(new CliqzMessages.OpenLink(UrlUtils.smartUrlFilter(content, true, searchUrl)));
                }
                return true;
            }
        }
        return false;
    }

    void showKeyBoard() {
        InputMethodManager inputMethodManager = (InputMethodManager) getActivity()
                .getSystemService(getActivity().INPUT_METHOD_SERVICE);
        inputMethodManager.showSoftInput(mAutocompleteEditText, InputMethodManager.SHOW_IMPLICIT);
    }

    // Hide the keyboard, used also in SearchFragmentListener
    void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) mAutocompleteEditText.getContext()
                .getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(mAutocompleteEditText.getWindowToken(), 0);
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
        mProgressBar.setProgress(event.progress);
        if (!mLightningView.getUrl().contains(TrampolineConstants.CLIQZ_TRAMPOLINE_GOTO)) {
            if (event.progress == 100) {
                switchIcon(ICON_STATE_NONE);
            } else {
                switchIcon(ICON_STATE_STOP);
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
        setAntiTrackingDetailsVisibility(View.VISIBLE);
        mLightningView.getWebView().bringToFront();
        state.setMode(Mode.WEBPAGE);
    }

    private void setAntiTrackingDetailsVisibility(int visibility) {
        if (antiTrackingDetails != null) {
            antiTrackingDetails.setVisibility(visibility);
        }
    }
    @Subscribe
    public void openLink(CliqzMessages.OpenLink event) {
        openLink(event.url, event.reset, false);
        mShowWebPageAgain = false;
    }

    @Subscribe
    public void addToFavourites(Messages.AddToFavourites event) {
        historyDatabase.setFavorites(event.url, System.currentTimeMillis(), true);
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
        telemetry.resetNavigationVariables(eventUrl.length());
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
     * Show the search interface in the current tab fro the given query
     * @param query the query to display (and search)
     */
    public void searchQuery(String query) {
        searchBar.showSearchEditText();
        mSearchWebView.bringToFront();
        inPageSearchBar.setVisibility(View.GONE);
        mLightningView.findInPage("");
        mAutocompleteEditText.requestFocus();
        if (query != null) {
            mAutocompleteEditText.setText(query);
            mAutocompleteEditText.setSelection(query.length());
        }
        state.setMode(Mode.SEARCH);
        setAntiTrackingDetailsVisibility(View.GONE);
        showKeyBoard();
    }

    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        // Due to webview bug (history manipulation doesn't work) we have to handle the back in a
        // different way.
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
            mAutocompleteEditText.requestFocus();
            showKeyBoard();
        }
    }

    private void onBackPressedV16() {
        final String url = mLightningView != null ? mLightningView.getUrl() : "";
        final Mode mode = state.getMode();
        if (hideOverFlowMenu()) {
            return;
        } else if (mode == Mode.WEBPAGE && mLightningView.canGoBack()) {
            telemetry.backPressed = true;
            telemetry.showingCards = false;
            mLightningView.goBack();
            mShowWebPageAgain = false;
        } else if (mode == Mode.SEARCH && mShowWebPageAgain) {
            bringWebViewToFront();
        } else {
            bus.post(new Messages.Exit());
        }
    }

    private void onBackPressedV21() {
        final String url = mLightningView != null ? mLightningView.getUrl() : "";
        final Mode mode = state.getMode();
        if (hideOverFlowMenu()) {
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
            bus.post(new Messages.Exit());
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
        mAutocompleteEditText.setAutocompleteText(event.completion);
    }

    @Subscribe
    public void reloadPage(Messages.ReloadPage event) {
        mLightningView.getWebView().reload();
    }

    @Subscribe
    public void shareLink(Messages.ShareLink event) {
        if(state.getMode() == Mode.SEARCH) {
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
        if(url.equals("-1")) {
            Toast.makeText(getContext(), getString(R.string.not_shareable), Toast.LENGTH_SHORT).show();
        } else {
            shareText(url);
            telemetry.sendShareSignal("cards");
        }
    }

    @Subscribe
    public void contactCliqz(Messages.ContactCliqz event) {
        final Uri to = Uri.parse(String.format("mailto:%s",
                getString(R.string.feedback_at_cliqz_dot_com)));
        final Intent intent = new Intent(Intent.ACTION_SENDTO);
        intent.setData(to);
        intent.putExtra(Intent.EXTRA_SUBJECT, getString(R.string.feedback_mail_subject));
        intent.putExtra(Intent.EXTRA_TEXT, new StringBuilder()
                        .append("\n")
                        .append("Feedback für CLIQZ for Android (")
                        .append(BuildConfig.VERSION_NAME)
                        .append("), auf ")
                        .append(Build.MODEL)
                        .append(" (")
                        .append(Build.VERSION.SDK_INT)
                        .append(")")
                        .toString()
        );
        //List of apps(package names) not to be shown in the chooser
        final ArrayList<String> blackList = new ArrayList<>();
        blackList.add("paypal");
        Intent customChooserIntent = CustomChooserIntent.create(getActivity().getPackageManager(),
                intent, getString(R.string.contact_cliqz), blackList);
        startActivity(customChooserIntent);
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
    public synchronized void hideToolBar(BrowserEvents.HideToolBar event) {
        if (mStatusBar.getTranslationY() >= 0.0f && !isAnimationInProgress) {
            final int height = mStatusBar.getHeight();
            //Don't hide the status bar if page is not long enough
            if (((CliqzWebView)mLightningView.getWebView()).getVerticalScrollHeight() - mLocalContainer.getHeight()
                    < 2*mStatusBar.getHeight()) {
                return;
            }
            isAnimationInProgress = true;
            mStatusBar.animate().translationY(-height).setInterpolator(new AccelerateInterpolator()).start();
            mContentContainer.animate().translationY(-height).setInterpolator(new AccelerateInterpolator())
                    .setListener(new Animator.AnimatorListener() {
                        @Override
                        public void onAnimationStart(Animator animation) {
                            int containerh = mContentContainer.getHeight();
                            mContentContainer.setLayoutParams(new LinearLayout.LayoutParams(
                                    LayoutParams.MATCH_PARENT, containerh + height));
                        }

                        @Override
                        public void onAnimationCancel(Animator animation) {
                        }

                        @Override
                        public void onAnimationRepeat(Animator animation) {
                        }

                        @Override
                        public void onAnimationEnd(Animator animation) {
                            isAnimationInProgress = false;
                        }
                    }).start();
        }
    }

    /**
     * @param event Marker for bus. Can be null if function is called directly.
     */
    @Subscribe
    public void showToolBar(BrowserEvents.ShowToolBar event) {
        if (mStatusBar.getTranslationY() < 0.0f && !isAnimationInProgress) {
            isAnimationInProgress = true;
            final int height = mStatusBar.getHeight();
            mStatusBar.animate().translationY(0).setInterpolator(new AccelerateInterpolator()).start();
            mContentContainer.animate().translationY(0).setInterpolator(new AccelerateInterpolator())
                    .setListener(new Animator.AnimatorListener() {
                        @Override
                        public void onAnimationStart(Animator animation) {
                        }

                        @Override
                        public void onAnimationCancel(Animator animation) {
                        }

                        @Override
                        public void onAnimationRepeat(Animator animation) {
                        }

                        @Override
                        public void onAnimationEnd(Animator animation) {
                            mContentContainer.setLayoutParams(new LinearLayout.LayoutParams(
                                    LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
                            isAnimationInProgress = false;
                        }
                    }).start();
        }
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
            YTDownloadDialog.show(getActivity(), videoUrls);
            telemetry.sendVideoDownloadSignal(event.targetType);
        }
    }

    @Subscribe
    public void updateTrackerCount(Messages.UpdateTrackerCount event) {
        mTrackerCount++;
        setTrackerCountText(Integer.toString(mTrackerCount));
    }

    @Subscribe
    public void resetTrackerCount(Messages.ResetTrackerCount event) {
        mTrackerCount = 0;
        setTrackerCountText(Integer.toString(mTrackerCount));
    }

    private void setTrackerCountText(String text) {
        if (trackerCounter != null) {
            trackerCounter.setText(text);
        }
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

    private void switchIcon(int type) {
        currentIcon = type;
        Drawable icon;
        switch (type) {
            case ICON_STATE_CLEAR:
                icon = ThemeUtils.getThemedDrawable(getContext(), R.drawable.ic_action_delete, true);
                break;
//            case RELOAD:
//                icon = ThemeUtils.getLightThemedDrawable(getContext(), R.drawable.ic_action_refresh);
//                break;
            case ICON_STATE_STOP:
                icon = ThemeUtils.getThemedDrawable(getContext(), R.drawable.ic_action_delete, true);
                break;
            case ICON_STATE_NONE:
                icon = null;
                final int height = ContextCompat.getDrawable(getContext(), R.drawable.ic_action_delete)
                        .getIntrinsicHeight();
                titleBar.setHeight(height);
                break;
            default:
                icon = ThemeUtils.getThemedDrawable(getContext(), R.drawable.ic_action_delete, true);
        }
        titleBar.setCompoundDrawablesWithIntrinsicBounds(null, null, icon, null);

    }

    private View.OnTouchListener onTouchListener = new View.OnTouchListener() {
        @Override
        public boolean onTouch(View view, MotionEvent event) {
            if (event.getAction() == MotionEvent.ACTION_UP) {
                int width = getContext().getResources().getDrawable(R.drawable.ic_action_delete).getIntrinsicWidth();
                if (event.getX() > (view.getWidth() - view.getPaddingRight()) - width) {
                    switch (currentIcon) {
                        case ICON_STATE_CLEAR:
                            searchBar.showSearchEditText();
                            mAutocompleteEditText.setText("");
                            break;
                        case ICON_STATE_STOP:
                            mLightningView.getWebView().stopLoading();
                            break;
//                        case RELOAD:
//                            mLightningView.getWebView().reload();
//                            break;
                    }
                    return true;
                }
            }
            return false;
        }
    };

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
}
