package com.cliqz.browser.main;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.content.res.TypedArray;
import android.graphics.Bitmap;
import android.graphics.PorterDuff;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.util.Patterns;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewStub;
import android.view.animation.Animation;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.annotation.ColorInt;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.annotation.StyleRes;
import androidx.appcompat.widget.AppCompatImageView;
import androidx.core.content.ContextCompat;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.controlcenter.ControlCenterHelper;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.Messages.ControlCenterStatus;
import com.cliqz.browser.main.search.SearchView;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.browser.utils.AppBackgroundManager;
import com.cliqz.browser.utils.ConfirmSubscriptionDialog;
import com.cliqz.browser.utils.EnableNotificationDialog;
import com.cliqz.browser.utils.RelativelySafeUniqueId;
import com.cliqz.browser.utils.SubscriptionsManager;
import com.cliqz.browser.vpn.VpnHandler;
import com.cliqz.browser.vpn.VpnPanel;
import com.cliqz.browser.webview.BrowserActionTypes;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.browser.widget.AutocompleteEditText;
import com.cliqz.browser.widget.OverFlowMenu;
import com.cliqz.browser.widget.SearchBar;
import com.cliqz.browser.widget.TabsCounter;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.nove.Subscribe;
import com.cliqz.utils.FragmentUtilsV4;
import com.cliqz.utils.NoInstanceException;
import com.cliqz.utils.StringUtils;
import com.cliqz.utils.ViewUtils;
import com.google.android.material.appbar.AppBarLayout;
import com.readystatesoftware.systembartint.SystemBarTintManager;

import org.jetbrains.annotations.NotNull;
import org.json.JSONArray;

import java.lang.reflect.Field;
import java.util.Objects;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.utils.UrlUtils;
import acr.browser.lightning.utils.Utils;
import acr.browser.lightning.view.AnimatedProgressBar;
import acr.browser.lightning.view.LightningView;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;
import butterknife.OnEditorAction;
import butterknife.Optional;
import timber.log.Timber;

import static android.R.attr.statusBarColor;

public class TabFragment2 extends FragmentWithBus implements LightningView.LightingViewListener {

    static final String KEY_URL = "cliqz_url_key";
    static final String KEY_QUERY = "query";
    static final String KEY_NEW_TAB_MESSAGE = "new_tab_message";
    static final String KEY_TAB_ID = "tab_id";
    static final String KEY_TITLE = "tab_title";
    static final String KEY_FORCE_RESTORE = "tab_force_restore";
    static final String KEY_OPEN_VPN_PANEL = "open_vpn_panel";

    private OverFlowMenu mOverFlowMenu = null;
    protected boolean mIsIncognito = false;
    private String mInitialUrl = null; // Initial url coming from outside the browser
    // Coming from history (or favorite) this is needed due to the url load delay introduced
    // for mitigating the multi process WebView on Android 8
    private CliqzMessages.OpenLink mOverviewEvent = null;
    // indicate that we should not load the mInitialUrl because we are restoring a persisted tab
    private boolean mShouldRestore = false;
    private boolean mShouldShowVpnPanel = false;
    private String mSearchEngine;
    private Message newTabMessage = null;
    private String mExternalQuery = null;
    public final CliqzBrowserState state = new CliqzBrowserState();
    boolean isHomePageShown = false;
    private JSONArray videoUrls = null;
    private int mTrackerCount = 0;
    String lastQuery = "";
    private String mId;

    private String mDelayedUrl = null;

    // A flag used to handle back button on old phones
    private boolean mShowWebPageAgain = false;
    private boolean mRequestDesktopSite = false;
    private boolean mIsReaderModeOn = false;

    private VpnPanel mVpnPanel;

    private static final int KEYBOARD_ANIMATION_DELAY = 200;

    private ControlCenterHelper mControlCenterHelper;

    @BindView(R.id.statusbar)
    AppBarLayout statusBar;

    @BindView(R.id.toolbar)
    FrameLayout toolbar;

    @BindView(R.id.search_edit_text)
    AutocompleteEditText searchEditText;

    @BindView(R.id.search_view_container)
    FrameLayout searchViewContainer;

    @BindView(R.id.progress_view)
    AnimatedProgressBar progressBar;

    @BindView(R.id.search_bar)
    SearchBar searchBar;

    @BindView(R.id.overflow_menu)
    View overflowMenuButton;

    @BindView(R.id.overflow_menu_icon)
    ImageView overflowMenuIcon;

    @BindView(R.id.in_page_search_bar)
    View inPageSearchBar;

    @Nullable
    @BindView(R.id.yt_download_icon)
    ImageButton ytDownloadIcon;

    @Nullable
    @BindView(R.id.control_center)
    ViewGroup antiTrackingDetails;

    @Nullable
    @BindView(R.id.open_tabs_count)
    TabsCounter openTabsCounter;

    @BindView(R.id.toolbar_container)
    ViewGroup toolBarContainer;

    @Nullable
    @BindView(R.id.quick_access_bar)
    QuickAccessBar quickAccessBar;

    @BindView(R.id.reader_mode_button)
    ImageButton readerModeButton;

    @Nullable
    @BindView(R.id.cc_icon)
    AppCompatImageView ccIcon;

    @Nullable
    @BindView(R.id.vpn_panel_button)
    AppCompatImageView mVpnPanelButton;

    @BindView(R.id.webview_container)
    LightningView lightningView;

    @Inject
    SearchView searchView2;

    @Inject
    SubscriptionsManager subscriptionsManager;

    @Inject
    AppBackgroundManager appBackgroundManager;

    @Inject
    TabsManager tabsManager;

    @Inject
    OnBoardingHelper onBoardingHelper;


    @Inject
    QueryManager queryManager;

    @Inject
    Adblocker adblocker;

    @Inject
    AntiTracking antiTracking;

    @Inject
    PurchasesManager purchasesManager;

    @Inject
    VpnHandler vpnHandler;

    @NonNull
    final String getTabId() {
        return mId;
    }

    public TabFragment2() {
        super();
        // This must be not null, but it can be rewritten by setArguments()
        mId = RelativelySafeUniqueId.createNewUniqueId();
    }

    @NotNull
    @Override
    public final View onCreateView(@NotNull LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final int themeResId = getFragmentTheme();

        final Activity activity = Objects.requireNonNull(getActivity());
        final Resources.Theme theme = activity.getTheme();
        final TypedValue value = new TypedValue();
        theme.resolveAttribute(R.attr.colorPrimaryDark, value, true);
        @ColorInt final int color = value.data;
        activity.getWindow().setStatusBarColor(color);
        SystemBarTintManager tintManager = new SystemBarTintManager(getActivity());
        tintManager.setStatusBarTintEnabled(true);
        tintManager.setNavigationBarTintEnabled(true);
        tintManager.setTintColor(statusBarColor);


        final LayoutInflater localInflater;
        if (themeResId != 0) {
            final Context themedContext = new ContextThemeWrapper(getContext(), themeResId);
            localInflater = inflater.cloneInContext(themedContext);
        } else {
            localInflater = inflater;
        }

        final View view = localInflater.inflate(R.layout.fragment_tab, container, false);
        if (BuildConfig.IS_NOT_LUMEN) {
            final ViewStub stub = view.findViewById(R.id.quick_access_bar_stub);
            stub.inflate();
        }
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ButterKnife.bind(this, view);
        searchBar.setSearchEditText(searchEditText);
        searchBar.setProgressBar(progressBar);
        final MainActivity activity = (MainActivity) getActivity();
        final FlavoredActivityComponent component = activity != null ?
                BrowserApp.getActivityComponent(activity) : null;
        if (component != null) {
            component.inject(this);
        }

        mControlCenterHelper =
                new ControlCenterHelper(getContext(), getChildFragmentManager());

        if (openTabsCounter != null) {
            openTabsCounter.setCounter(tabsManager.getTabCount());
        }

        updateUI();
        inPageSearchBar.setVisibility(View.GONE);
        state.setIncognito(mIsIncognito);
        searchBar.setStyle(mIsIncognito);
        lightningView.restoreTab(mId);
        lightningView.setListener(this);

        TabFragmentListener.create(this);
        if (state.getMode() == Mode.WEBPAGE &&
                UrlUtils.isYoutubeVideo(lightningView.getUrl())) {
            fetchYoutubeVideo(null);
        }
        searchView2.setCurrentTabState(state);
        ViewUtils.safelyAddView(searchViewContainer, searchView2);
        searchBar.setTrackerCount(mTrackerCount);
        if (quickAccessBar != null) {
            quickAccessBar.setSearchTextView(searchEditText);
            quickAccessBar.hide();
        }
        onPageFinished(null);
    }

    private void delayedPostOnBus(final Object event) {
        handler.postDelayed(() -> bus.post(event), KEYBOARD_ANIMATION_DELAY);
    }

    @Override
    public void setArguments(@Nullable Bundle args) {
        if (args == null) {
            return;
        }
        newTabMessage = args.getParcelable(KEY_NEW_TAB_MESSAGE);
        // Remove asap the message from the bundle
        args.remove(KEY_NEW_TAB_MESSAGE);
        mId = args.getString(KEY_TAB_ID);

        final String url = args.getString(KEY_URL);
        final String title = args.getString(KEY_TITLE);
        final boolean incognito = args.getBoolean(MainActivity.EXTRA_IS_PRIVATE, false);
        if (url != null && !url.isEmpty()) {
            state.setUrl(url);
            state.setTitle(title != null ? title : url);
            state.setMode(Mode.WEBPAGE);
            state.setIncognito(incognito);
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
        mIsIncognito = arguments.getBoolean(MainActivity.EXTRA_IS_PRIVATE, false);
        mInitialUrl = arguments.getString(KEY_URL);
        mShouldRestore = arguments.getBoolean(KEY_FORCE_RESTORE);
        final String mInitialTitle = arguments.getString(KEY_TITLE);
        mExternalQuery = arguments.getString(KEY_QUERY);
        if (mInitialUrl != null) {
            state.setUrl(mInitialUrl);
        }
        if (mInitialTitle != null) {
            state.setTitle(mInitialTitle);
        }
        mShouldShowVpnPanel = arguments.getBoolean(KEY_OPEN_VPN_PANEL);
        // We need to remove the key, otherwise the url/query/msg gets reloaded for each resume
        arguments.remove(KEY_URL);
        arguments.remove(KEY_NEW_TAB_MESSAGE);
        arguments.remove(KEY_QUERY);
        arguments.remove(KEY_TAB_ID);
        arguments.remove(KEY_FORCE_RESTORE);
        arguments.remove(KEY_OPEN_VPN_PANEL);
    }

    // Use this to get which view is visible between home, cards or web
    @NonNull
    String getTelemetryView() {
        if (state.getMode() == Mode.WEBPAGE) {
            return TelemetryKeys.WEB;
        } else if (searchView2.isFreshTabVisible()) {
            return TelemetryKeys.HOME;
        } else {
            return TelemetryKeys.CARDS;
        }
    }

    private void updateVpnIcon() {
        if (mVpnPanelButton != null) {
            if (vpnHandler.isVpnConnected()) {
                mVpnPanelButton.setImageResource(getFlavorDrawable("ic_vpn_on"));
            } else {
                mVpnPanelButton.setImageResource(getFlavorDrawable("ic_vpn_off"));
            }
        }
    }

    private void updateCCIcon(boolean isLoadingFinished) {
        if (BuildConfig.IS_LUMEN) {
            final String url = lightningView.getUrl();
            if (url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)) {
                return; //We don't update dashboard icon states for trampoline redirects
            }

            if (purchasesManager.isDashboardEnabled() && preferenceManager.getAdBlockEnabled()
                    && preferenceManager.isAttrackEnabled()) {
                Objects.requireNonNull(ccIcon).setImageResource(getFlavorDrawable(isLoadingFinished
                        ? "ic_dashboard_checked" : "ic_dashboard_on"));
            } else {
                Objects.requireNonNull(ccIcon).setImageResource(getFlavorDrawable("ic_dashboard_off"));
            }
        }
    }

    private int getFlavorDrawable(@NonNull String name) {
        return getResources().getIdentifier(name, "drawable",
                BrowserApp.getAppContext().getPackageName());
    }

    @Override
    public void onStart() {
        super.onStart();
        if (mDelayedUrl != null) {
            openLink(mDelayedUrl, true, true, null);
            mDelayedUrl = null;
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (searchView2 != null) {
            searchView2.onResume();
            searchView2.setVisibility(View.VISIBLE);
        }
        // final WebView webView;
        if (lightningView != null) {
            lightningView.onResume();
            lightningView.resumeTimers();
        }

        searchBar.setIsAutocompletionEnabled(preferenceManager.getAutocompletionEnabled());

        if (state.getMode() == Mode.WEBPAGE) {
            bringWebViewToFront(null);
        } else {
            bringSearchToFront();
            //update topsites and news whenever app resumes or comes back from settings
            searchView2.updateFreshTab();
        }

        // The code below shouldn't be executed if app is reset
        if (mShouldRestore) {
            state.setMode(Mode.WEBPAGE);
            bringWebViewToFront(null);
            mShouldRestore = false;
        } else if (mInitialUrl != null) {
            state.setMode(Mode.WEBPAGE);
            bus.post(CliqzMessages.OpenLink.resetAndOpen(mInitialUrl));
        } else if (mOverviewEvent != null && mOverviewEvent.url != null && !mOverviewEvent.url.isEmpty()) {
            state.setMode(Mode.WEBPAGE);
            // Repost the message
            bus.post(mOverviewEvent);
        } else if (newTabMessage != null && newTabMessage.obj != null) {
            final WebView.WebViewTransport transport = (WebView.WebViewTransport) newTabMessage.obj;
            lightningView.setTransportWebView(transport);
            newTabMessage.sendToTarget();
            newTabMessage = null;
            bringWebViewToFront(null);
        } else if (mExternalQuery != null && !mExternalQuery.isEmpty()) {
            state.setMode(Mode.SEARCH);
            bus.post(new Messages.ShowSearch(mExternalQuery));
        } else {
            final String lightningUrl = lightningView.getUrl();
            final String query = state.getQuery();
            final boolean mustShowSearch = lightningUrl.isEmpty() && !query.isEmpty();
            if (mustShowSearch) {
                state.setMode(Mode.SEARCH);
            }
            if (state.getMode() == Mode.SEARCH) {
                //showToolBar(null);
                if (!query.isEmpty()) {
                    delayedPostOnBus(new Messages.ShowSearch(query));
                } else {
                    searchBar.setTitle(searchBar.getQuery());
                    searchBar.showTitleBar();
                    progressBar.setVisibility(View.INVISIBLE);
                }
            } else {
                enableUrlBarScrolling();
                searchBar.showTitleBar();
                searchBar.showProgressBar();
                searchBar.setAntiTrackingDetailsVisibility(View.VISIBLE);
                searchBar.setTitle(lightningView.getUrl());
            }
        }

        mInitialUrl = null;
        mOverviewEvent = null;

        if (!preferenceManager.isAttrackEnabled() && ccIcon != null) {
            ccIcon.setImageLevel(ControlCenterStatus.DISABLED.ordinal());
        }
        queryManager.setForgetMode(mIsIncognito);
        mIsReaderModeOn = false;
        readerModeButton.setImageResource(R.drawable.ic_reader_mode_off);
        updateCCIcon(progressBar.getProgress() == 100);
        updateVpnIcon();
        if (mShouldShowVpnPanel) {
            handler.post(() -> {
                toggleVpnView();
                mShouldShowVpnPanel = false;
            });
        }
    }

    void bringSearchToFront() {
        lightningView.setVisibility(View.GONE);
        searchViewContainer.setVisibility(View.VISIBLE);
        searchView2.refresh();
    }

    private int getFragmentTheme() {
        if (mIsIncognito) {
            return R.style.Theme_LightTheme_Incognito;
        } else {
            return R.style.Theme_Cliqz_Overview;
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE &&
                quickAccessBar != null) {
            quickAccessBar.hide();
        }
    }

    @Optional
    @OnClick(R.id.menu_overview)
    void historyClicked() {
        hideKeyboard(null);
        telemetry.sendOverViewSignal(tabsManager.getTabCount(),
                mIsIncognito, getTelemetryView());
        delayedPostOnBus(new Messages.GoToOverview());
    }

    @OnClick(R.id.overflow_menu)
    void menuClicked() {
        telemetry.sendOverflowMenuSignal(mIsIncognito, getTelemetryView());
        if (mOverFlowMenu != null && mOverFlowMenu.isShown()) {
            mOverFlowMenu.dismiss();
        } else {
            final String url = lightningView.getUrl();
            mOverFlowMenu = new OverFlowMenu(getActivity());
            mOverFlowMenu.setCanGoForward(lightningView.canGoForward());
            mOverFlowMenu.setAnchorView(overflowMenuButton);
            mOverFlowMenu.setIncognitoMode(mIsIncognito);
            mOverFlowMenu.setUrl(url);
            mOverFlowMenu.setFavorite(historyDatabase.isFavorite(url));
            mOverFlowMenu.setTitle(lightningView.getTitle());
            mOverFlowMenu.setState(state);
            mOverFlowMenu.setIsFreshTabVisible(searchView2.isFreshTabVisible());
            mOverFlowMenu.setDesktopSiteEnabled(mRequestDesktopSite);
            mOverFlowMenu.show();
            hideKeyboard(null);
            bus.post(new Messages.DismissControlCenter());
            bus.post(new Messages.DismissVpnPanel());
        }
    }

    @SuppressWarnings("unused")
    @Subscribe
    void onOpenMenuMessage(Messages.OnOpenMenuButton event) {
        menuClicked();
    }

    @OnClick(R.id.in_page_search_cancel_button)
    void closeInPageSearchClosed() {
        inPageSearchBar.setVisibility(View.GONE);
        lightningView.findInPage("");
    }

    @OnClick(R.id.in_page_search_up_button)
    void previousResultInPageSearchClicked() {
        lightningView.findPrevious();
    }

    @OnClick(R.id.in_page_search_down_button)
    void nextResultInPageSearchClicked() {
        lightningView.findNext();
    }

    // TODO @Ravjit, the dialog should disappear if you pause the app
    @Optional
    @OnClick(R.id.cc_icon)
    void showControlCenter() {
        mControlCenterHelper.setControlCenterData(statusBar, mIsIncognito,
                lightningView.webViewHashCode(),
                lightningView.getUrl());
        mControlCenterHelper.toggleControlCenter();
        telemetry.sendControlCenterOpenSignal(mIsIncognito, mTrackerCount);
    }

    @Optional
    @OnClick(R.id.yt_download_icon)
    void showYTDownloadDialog() {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            telemetry.sendYTIconClickedSignal(mIsIncognito);
            final ConnectivityManager connectivityManager =
                    (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            final NetworkInfo activeNetwork = connectivityManager != null ?
                    connectivityManager.getActiveNetworkInfo() : null;
            if (activeNetwork != null && activeNetwork.getType() != ConnectivityManager.TYPE_WIFI &&
                    preferenceManager.shouldLimitDataUsage()) {
                NoWiFiDialog.show(getContext(), bus);
                return;
            }
            if (videoUrls != null) {
                YTDownloadDialog.show((MainActivity) getActivity(), videoUrls, telemetry);
            }
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    @OnClick(R.id.reader_mode_button)
    void toggleReaderMode() {
        if (!mIsReaderModeOn) {
            mIsReaderModeOn = true;
            readerModeButton.setImageResource(R.drawable.ic_reader_mode_on);
            lightningView.readerMode();
        } else {
            mIsReaderModeOn = false;
            readerModeButton.setImageResource(R.drawable.ic_reader_mode_off);
            lightningView.webMode();
        }
    }

    @Optional
    @OnClick(R.id.vpn_panel_button)
    void toggleVpnView() {
        if (mVpnPanel != null && mVpnPanel.isVisible()) {
            mVpnPanel.getDialog().dismiss();
            return;
        }
        mVpnPanel = VpnPanel.create(statusBar);
        mVpnPanel.show(getChildFragmentManager(), Constants.VPN_PANEL);
        handler.postDelayed(() -> bus.post(new Messages.DismissControlCenter()), 500);
    }

    @SuppressWarnings("UnusedParameters")
    @OnEditorAction(R.id.search_edit_text)
    boolean onEditorAction(EditText editText, int actionId, KeyEvent keyEvent) {
        // Navigate to autocomplete url or search otherwise
        if (keyEvent != null && keyEvent.getKeyCode() == KeyEvent.KEYCODE_ENTER
                && keyEvent.getAction() == KeyEvent.ACTION_DOWN) {
            final String content = searchBar.getSearchText();
            if (content != null && !content.isEmpty()) {
                final Object event;
                if (Patterns.WEB_URL.matcher(content).matches()) {
                    final String guessedUrl = StringUtils.guessUrl(content);
                    if (searchBar.isAutoCompleted()) {
                        telemetry.sendResultEnterSignal(false, true,
                                searchBar.getQuery().length(), guessedUrl.length());
                    } else {
                        telemetry.sendResultEnterSignal(false, false, content.length(), -1);
                    }
                    event = CliqzMessages.OpenLink.open(guessedUrl);
                } else {
                    telemetry.sendResultEnterSignal(true, false, content.length(), -1);
                    setSearchEngine();
                    String searchUrl = mSearchEngine + UrlUtils.QUERY_PLACE_HOLDER;
                    event = CliqzMessages.OpenLink.open(UrlUtils.smartUrlFilter(content, true, searchUrl));
                }
                if (!onBoardingHelper.conditionallyShowSearchDescription()) {
                    bus.post(event);
                } else {
                    hideKeyboard(null);
                }
                return true;
            }
        }
        return false;
    }

    @Subscribe
    public void showKeyBoard(CliqzMessages.ShowKeyboard event) {
        searchBar.postDelayed(searchBar::showKeyBoard, 200);
    }

    // Hide the keyboard, used also in SearchFragmentListener
    @Subscribe
    void hideKeyboard(CliqzMessages.HideKeyboard event) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            InputMethodManager imm = (InputMethodManager) context
                    .getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm == null) {
                return;
            }
            imm.hideSoftInputFromWindow(searchBar.getWindowToken(), 0);
            final View set = searchBar.getSearchEditText();
            // This if avoids calling searchBar.showTitleBar() multiple times and sending the same
            // telemetry signals multiple times
            if (set != null && imm.isActive(set)) {
                //searchBar.showTitleBar();
                final String view = getTelemetryView();
                telemetry.sendKeyboardSignal(false, mIsIncognito, getTelemetryView());
                telemetry.sendQuickAccessBarSignal(TelemetryKeys.HIDE, null, view);
                if (quickAccessBar != null) {
                    quickAccessBar.hide();
                }
            }
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    private void shareText(String text) {
        final String footer = getString(R.string.shared_using);
        final Intent intent = new Intent(Intent.ACTION_SEND);
        intent.setType("text/plain");
        intent.putExtra(Intent.EXTRA_TEXT, text + "\n" + footer);
        startActivity(Intent.createChooser(intent, getString(R.string.share_link)));
    }

    @Subscribe
    public void updateProgress(BrowserEvents.UpdateProgress event) {
        searchBar.setProgress(event.progress);
        if (state.getMode() == Mode.SEARCH) {
            return;
        }
        if (!lightningView.getUrl().contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)) {
            if (event.progress == 100) {
                // Re-adjust the layout in cases when height of content is not more than the
                // visible content height + toolbar height
                // TODO Check this
//                final AppBarLayout.LayoutParams params =
//                        (AppBarLayout.LayoutParams) toolbar.getLayoutParams();
//                final WebView webView = lightningView.getWebView();
//                if (webView.getContentHeight() <= webView.getHeight()) {
//                    disableUrlBarScrolling();
//                } else if (params.getScrollFlags() == 0) {
//                    enableUrlBarScrolling();
//                }
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
        if (url != null && !url.isEmpty() && !url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)) {
            state.setUrl(url);
            searchBar.setTitle(url);
            searchBar.setSecure(isHttpsUrl(url));
        }
    }

    private void bringWebViewToFront(Animation animation) {
        lightningView.setVisibility(View.VISIBLE);
        searchViewContainer.setVisibility(View.INVISIBLE);
        searchBar.showTitleBar();
        searchBar.showProgressBar();
        final String url = lightningView.getUrl();
        searchBar.setTitle(url);
        searchBar.setSecure(isHttpsUrl(url));
        searchBar.setAntiTrackingDetailsVisibility(View.VISIBLE);
        lightningView.setWebViewAnimation(animation);
        enableUrlBarScrolling();
        state.setMode(Mode.WEBPAGE);
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            updateToolbarContainer(context, preferenceManager.isBackgroundImageEnabled());
            overflowMenuIcon.setColorFilter(ContextCompat.getColor(context, R.color.white),
                    PorterDuff.Mode.SRC_IN);
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    LightningView getLightningView() {
        return lightningView;
    }

    private boolean isHttpsUrl(@Nullable String url) {
        return url != null && url.startsWith("https://");
    }

    private void updateToolbarContainer(@NonNull Context context, boolean isBackgroundEnabled) {
        if (mIsIncognito) {
            appBackgroundManager.setViewBackgroundColor(toolBarContainer,
                    ContextCompat.getColor(context, R.color.incognito_tab_primary_color));
        } else if (isBackgroundEnabled) {
            appBackgroundManager.setViewBackground(toolBarContainer,
                    ContextCompat.getColor(context, R.color.primary_color));
        } else {
            appBackgroundManager.setViewBackgroundColor(toolBarContainer,
                    ContextCompat.getColor(context, R.color.primary_color));
        }
    }

    @Subscribe
    public void openLink(CliqzMessages.OpenLink event) {
        queryManager.addLatestQueryToDatabase();
        openLink(event.url, event.reset, event.fromHistory, event.animation);
        mShowWebPageAgain = false;
    }

    @Subscribe
    public void addToFavourites(Messages.AddToFavourites event) {
        historyDatabase.setFavorites(event.url, event.title, System.currentTimeMillis(), true);
    }

    @Subscribe
    public void searchOnPage(BrowserEvents.SearchInPage event) {
        SearchInPageDialog.show(getContext(), inPageSearchBar, lightningView);
    }

    @Subscribe
    public void onReadableVersionAvailable(CliqzMessages.OnReadableVersionAvailable event) {
        readerModeButton.setVisibility(View.VISIBLE);
    }

    @Subscribe
    public void onPageFinished(CliqzMessages.OnPageFinished event) {
        updateCCIcon(true);
    }


    public void openLink(String eventUrl, boolean reset, boolean fromHistory, Animation animation) {

        //if Request Desktop site is enabled, remove "m." if it is a mobile url
        if (mRequestDesktopSite && (eventUrl.startsWith("m.") || eventUrl.contains("/m."))) {
            eventUrl = eventUrl.replaceFirst("m.", "");
        }

        if (lightningView == null) {
            mDelayedUrl = eventUrl;
            return;
        }
        if (telemetry != null) {
            telemetry.resetNavigationVariables(eventUrl.length());
        }

        final Uri.Builder builder = Uri.parse(eventUrl).buildUpon();
        builder.appendQueryParameter(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME,
                TrampolineConstants.TRAMPOLINE_COMMAND_GOTO)
                .appendQueryParameter(TrampolineConstants.TRAMPOLINE_QUERY_PARAM_NAME, lastQuery);
        if (reset) {
            builder.appendQueryParameter(TrampolineConstants.TRAMPOLINE_RESET_PARAM_NAME, "true");
        }
        if (fromHistory) {
            builder.appendQueryParameter(TrampolineConstants.TRAMPOLINE_FROM_HISTORY_PARAM_NAME, "true");
        }
        final String url = builder.build().toString();
        lightningView.loadUrl(url);
        searchBar.setTitle(eventUrl);
        searchBar.setSecure(isHttpsUrl(eventUrl));
        bringWebViewToFront(animation);
        if (quickAccessBar != null) {
            quickAccessBar.hide();
        }
        telemetry.sendQuickAccessBarSignal(TelemetryKeys.HIDE, null, getTelemetryView());
    }

    /**
     * Show the search interface in the current tab for the given query
     *
     * @param query the query to display (and search)
     */
    public void searchQuery(@Nullable String query) {
        // Sanitize the query
        query = query != null ? query : "";
        searchBar.showSearchEditText();
        bringSearchToFront();
        disableUrlBarScrolling();
        inPageSearchBar.setVisibility(View.GONE);
        lightningView.findInPage("");
        searchBar.requestSearchFocus();
        searchBar.setSearchText(query);
        searchBar.setCursorPosition(query.length());
        state.setMode(Mode.SEARCH);
        state.setQuery(query);
        searchBar.setAntiTrackingDetailsVisibility(View.GONE);
        searchBar.showKeyBoard();
        searchView2.updateQuery(query, 0, query.length());
    }

    @SuppressLint("ObsoleteSdkInt")
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

    private void onBackPressedV16() {
        final Mode mode = state.getMode();
        if (!onBoardingHelper.close() && !hideOverFlowMenu()) {
            if (mIsReaderModeOn) {
                lightningView.webMode();
            } else if (mode == Mode.WEBPAGE && lightningView.canGoBack()) {
                telemetry.backPressed = true;
                telemetry.showingCards = false;
                lightningView.goBack();
                mShowWebPageAgain = false;
            } else if (mode == Mode.SEARCH && mShowWebPageAgain) {
                bringWebViewToFront(null);
            } else {
                bus.post(new BrowserEvents.CloseTab());
            }
        }
    }

    private void onBackPressedV21() {
        final String url = lightningView != null ? lightningView.getUrl() : "";
        final Mode mode = state.getMode();
        if (!onBoardingHelper.close() && !hideOverFlowMenu()) {
            if (mIsReaderModeOn) {
                toggleReaderMode();
            } else if (mode == Mode.SEARCH &&
                    !"".equals(url) &&
                    !url.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME + "=" + TrampolineConstants.TRAMPOLINE_COMMAND_SEARCH)) {
                bringWebViewToFront(null);
                if (UrlUtils.isYoutubeVideo(lightningView.getUrl())) {
                    fetchYoutubeVideo(null);
                }
            } else if (lightningView.canGoBack()) {
                // In any case the trampoline will be current page predecessor
                if (mode == Mode.SEARCH) {
                    bringWebViewToFront(null);
                }
                telemetry.backPressed = true;
                telemetry.showingCards = mode == Mode.SEARCH;
                lightningView.goBack();
            } else {
                bus.post(new BrowserEvents.CloseTab());
            }
        }
    }

    // Hide the OverFlowMenu if it is visible. Return true if it was, false otherwise.
    @SuppressWarnings("BooleanMethodIsAlwaysInverted")
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
        if (lightningView.canGoForward()) {
            lightningView.goForward();
            if (state.getMode() == Mode.SEARCH) {
                bringWebViewToFront(null);
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
        lightningView.reload();
    }

    @Subscribe
    public void shareLink(Messages.ShareLink event) {
        if (state.getMode() != Mode.SEARCH) {
            final String url = lightningView.getUrl();
            shareText(url);
            telemetry.sendShareSignal(TelemetryKeys.WEB);
        }
    }

    @Subscribe
    public void shareCard(Messages.ShareCard event) {
        new ShareCardHelper(getActivity(), lightningView, event.cardDetails);
        telemetry.sendShareSignal(TelemetryKeys.CARDS);

    }

    @Subscribe
    public void copyUrl(Messages.CopyUrl event) {
        putInClipboard(R.string.message_url_copied, lightningView.getUrl(), "link");
    }

    @Subscribe
    public void saveLink(Messages.SaveLink event) {
        final String userAgent = lightningView.getUserAgentString();
        Utils.downloadFile(getActivity(), lightningView.getUrl(), userAgent, "attachment", false);
    }

    @Subscribe
    public void copyData(CliqzMessages.CopyData event) {
        putInClipboard(R.string.message_text_copied, event.data, "result");
    }

    private void putInClipboard(@SuppressWarnings("unused") @StringRes int message,
                                @NonNull String data, @NonNull String label) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            final ClipboardManager clipboard = (ClipboardManager) context
                    .getSystemService(Context.CLIPBOARD_SERVICE);
            if (clipboard != null) {
                final ClipData clip = ClipData.newPlainText(label, data);
                clipboard.setPrimaryClip(clip);
            }
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    @Subscribe
    public void callNumber(CliqzMessages.CallNumber event) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            final BrowserActionTypes action = BrowserActionTypes.phoneNumber;
            Intent callIntent = action.getIntent(context, event.number);
            if (callIntent != null) {
                context.startActivity(callIntent);
            }
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    @Subscribe
    public void setYoutubeUrls(Messages.SetVideoUrls event) {
        videoUrls = event.urls;
        if (videoUrls == null) {
            hideYTIcon();
            return;
        }
        if (videoUrls.length() == 0) {
            telemetry.sendVideoPageSignal(false);
            hideYTIcon();
        } else {
            telemetry.sendVideoPageSignal(true);
            showYTIcon();
            onBoardingHelper.conditionallyShowYouTubeDescription();
        }
    }

    @Subscribe
    public void fetchYoutubeVideo(Messages.FetchYoutubeVideoUrls event) {
        videoUrls = null;
        // To fetch the videos url we have to run the ytdownloader.getUrls script that is bundled
        // with the extension
        searchView2.fetchYouTubeUrls(lightningView.getUrl());
    }

    @Subscribe
    public void downloadYoutubeVideo(Messages.DownloadYoutubeVideo event) {
        if (videoUrls != null) {
            YTDownloadDialog.show((MainActivity) getActivity(), videoUrls, telemetry);
            preferenceManager.setShouldShowYouTubeDescription(false);
        }
    }

    @Override
    public void increaseAntiTrackingCounter() {
        mTrackerCount++;
        // Quick fix for Ad-Block loading problems (attrack.isWhitelist(...) timeout)
        if (mTrackerCount == 1) {
            bus.post(new Messages.UpdateControlCenterIcon(ControlCenterStatus.ENABLED));
        }
        searchBar.setTrackerCount(mTrackerCount);
        if (mTrackerCount > 0 && onBoardingHelper.conditionallyShowAntiTrackingDescription()) {
            hideKeyboard(null);
        }
        bus.post(new Messages.UpdateAntiTrackingList(mTrackerCount));
        bus.post(new Messages.UpdateAdBlockingList());
    }

    @Override
    public void onFavIconLoaded(Bitmap favicon) {
        state.setFavIcon(favicon);
    }

    //Hack to update the counter in the url bar to match with that in the CC when user opens CC
    @Subscribe
    public void updateTrackerCountHack(Messages.ForceUpdateTrackerCount event) {
        mTrackerCount = event.trackerCount;
        searchBar.setTrackerCount(event.trackerCount);
    }

    @Subscribe
    public void resetTrackerCount(Messages.ResetTrackerCount event) {
        mTrackerCount = 0;
        searchBar.setTrackerCount(mTrackerCount);
        readerModeButton.setVisibility(View.GONE);
    }

    @SuppressLint("SetTextI18n")
    @Subscribe
    public void updateTabCounter(Messages.UpdateTabCounter event) {
        if (openTabsCounter == null) {
            return;
        }
        openTabsCounter.setCounter(event.count);
    }

    @Subscribe
    public void updateUserAgent(Messages.ChangeUserAgent event) {
        if (lightningView != null) {
            if (event.isDesktopSiteEnabled) {
                lightningView.setDesktopUserAgent();
            } else {
                lightningView.setMobileUserAgent();
            }
        }
        mRequestDesktopSite = event.isDesktopSiteEnabled;
    }

    @Subscribe
    public void openUrlInCurrentTab(BrowserEvents.OpenUrlInCurrentTab event) {
        if (lightningView != null && !event.url.isEmpty()) {
            lightningView.loadUrl(event.url);
        }
    }

    private void updateTitle() {
        if (state.getMode() == Mode.SEARCH) {
            return;
        }
        final String title = lightningView.getTitle();
        state.setTitle(title);
    }

    private void setSearchEngine() {
        mSearchEngine = getString(preferenceManager.getSearchChoice().engineUrl);
    }

    void resetFindInPage() {
        if (lightningView != null) {
            lightningView.findInPage("");
        }
    }

    private void showToolbar() {
        statusBar.setExpanded(true, true);
    }

    @Subscribe
    public void switchToForgetMode(Messages.SwitchToForget event) {
        Toast.makeText(getContext(), getString(R.string.switched_to_forget), Toast.LENGTH_SHORT).show();
        mIsIncognito = true;
        state.setIncognito(true);
        lightningView.setIsIncognitoTab(true);
        lightningView.setIsAutoForgetTab(true);
        updateUI();
        searchView2.initExtensionPreferences();
        queryManager.setForgetMode(true);
    }

    @Subscribe
    public void switchToNormalMode(Messages.SwitchToNormalTab event) {
        mIsIncognito = false;
        state.setIncognito(false);
        lightningView.setIsIncognitoTab(false);
        lightningView.setIsAutoForgetTab(false);
        updateUI();
        searchView2.initExtensionPreferences();
    }

    @Subscribe
    public void showToolBar(BrowserEvents.ShowToolBar event) {
        showToolbar();
    }

    @Subscribe
    public void updateControlIcon(Messages.UpdateControlCenterIcon event) {
        if (ccIcon == null) {
            return;
        }
        final ControlCenterStatus status;
        if (!preferenceManager.isAttrackEnabled()) {
            status = ControlCenterStatus.DISABLED;
        } else {
            status = event.status;
        }
        ccIcon.setImageLevel(status.ordinal());
        updateCCIcon(false);
    }

    @Subscribe
    public void enableAdBlock(Messages.EnableAdBlock event) {
        preferenceManager.setAdBlockEnabled(true);
        lightningView.enableAdBlock();
        lightningView.reload();
    }

    @Subscribe
    public void enableAttrack(Messages.EnableAttrack event) {
        preferenceManager.setAttrackEnabled(true);
        lightningView.enableAttrack();
        lightningView.reload();
    }

    @Subscribe
    public void updateFavIcon(Messages.UpdateFavIcon event) {
        state.setFavIcon(lightningView.getFavicon());
    }

    @Subscribe
    public void keyBoardClosed(Messages.KeyBoardClosed event) {
        searchBar.setTitle(searchBar.getQuery());
        searchBar.clearFocus(); // .showTitleBar();
    }

    @Subscribe
    public void updateQuery(Messages.UpdateQuery event) {
        searchBar.updateQuery(event.suggestion);
    }

    @Subscribe
    public void suggestions(Messages.QuerySuggestions event) {
        final String query = searchBar.getQuery();
        if (quickAccessBar == null) {
            return;
        }
        if (query.length() == 0) {
            return;
        }
        if (!query.startsWith(event.query)) {
            return;
        }
        quickAccessBar.showSuggestions(event.suggestions, event.query);
    }

    @Subscribe
    public void subscribeToNotifications(CliqzMessages.Subscribe event) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            if (event.type == null || event.subtype == null || event.id == null ||
                    EnableNotificationDialog.showIfNeeded(context, telemetry) != null) {
                return;
            }
            if (!preferenceManager.isFirstSubscription()) {
                subscriptionsManager.addSubscription(event.type, event.subtype, event.id);
                event.resolve();
            } else {
                ConfirmSubscriptionDialog.show(context, bus,
                        subscriptionsManager, telemetry, event);
                preferenceManager.setFirstSubscription(false);
            }
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
    }

    @Subscribe
    public void unsubscribeToNotifications(CliqzMessages.Unsubscribe event) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            if (event.type == null || event.subtype == null || event.id == null ||
                    EnableNotificationDialog.showIfNeeded(context, telemetry) != null) {
                return;
            }
            subscriptionsManager.removeSubscription(event.type, event.subtype, event.id);
        } catch (NoInstanceException e) {
            Timber.e(e, "Null context");
        }
        event.resolve();
    }

    @Subscribe
    public void notifySubscrioption(Messages.NotifySubscription event) {
        searchView2.initExtensionPreferences();
    }

    @Subscribe
    public void onFreshTabVisible(Messages.OnFreshTabVisible event) {
        try {
            final Context context = FragmentUtilsV4.getContext(this);
            final boolean isBackgroundEnabled = preferenceManager.isBackgroundImageEnabled();
            updateToolbarContainer(context, isBackgroundEnabled);
            @ColorInt final int color = ContextCompat.getColor(context, R.color.white);
            overflowMenuIcon.setColorFilter(color, PorterDuff.Mode.SRC_IN);
            readerModeButton.setVisibility(View.GONE);
            mIsReaderModeOn = false;
            readerModeButton.setImageResource(R.drawable.ic_reader_mode_off);
        } catch (NoInstanceException e) {
            Timber.e("Null context");
        }
        hideYTIcon();
    }

    @Subscribe
    public void onOrientationChanged(Configuration newConfig) {
        final String view;
        if (state.getMode() == Mode.SEARCH) {
            if (searchView2.isFreshTabVisible()) {
                view = TelemetryKeys.HOME;
            } else {
                view = TelemetryKeys.CARDS;
            }
        } else {
            view = TelemetryKeys.WEB;
        }
        telemetry.sendOrientationSignal(newConfig.orientation == Configuration.ORIENTATION_LANDSCAPE ?
                TelemetryKeys.LANDSCAPE : TelemetryKeys.PORTRAIT, view);
    }

    @Subscribe
    public void onDashboardStateChange(Messages.OnDashboardStateChange message) {
        updateCCIcon(false);
    }

    @Subscribe
    public void onVpnStateChange(Messages.onVpnStateChange message) {
        updateVpnIcon();
    }

    @Subscribe
    void onSearchBarClearPressed(@Nullable Messages.SearchBarClearPressed msg) {
        telemetry.sendClearUrlBarSignal(mIsIncognito, searchBar.getSearchText().length(), getTelemetryView());
        state.setQuery("");
    }

    @Subscribe
    void onSearchBarBackPressed(@Nullable Messages.SearchBarBackPressed msg) {
        telemetry.sendBackIconPressedSignal(mIsIncognito, searchView2.isFreshTabVisible());
        if (!lightningView.getUrl().isEmpty()) {
            bringWebViewToFront(null);
        } else {
            searchQuery("");
        }
    }

    @Subscribe
    void onGoToFavorites(@NonNull Messages.GoToFavorites msg) {
        if (BuildConfig.IS_NOT_LUMEN) {
            return;
        }

        state.setMode(Mode.SEARCH);
        searchBar.showSearchEditText();
        searchView2.showFavorites();
    }

    @Subscribe
    void onTrialPeriodResponse(Messages.OnTrialPeriodResponse msg) {
        updateCCIcon(false);
    }

    private void updateUI() {
        try {
            final Activity activity = FragmentUtilsV4.getActivity(this);
            @StyleRes final int themeId = getFragmentTheme();
            final Context wrapper = new ContextThemeWrapper(activity, themeId);
            final Resources.Theme theme = wrapper.getTheme();

            int[] attrs;
            try {
                final Field field = android.R.attr.class.getDeclaredField("statusBarColor");
                final int attr = field.getInt(null);
                attrs = new int[]{
                        attr,
                        R.attr.textColorPrimary,
                };
            } catch (Throwable e) {
                attrs = new int[]{
                        R.attr.colorPrimaryDark,
                        R.attr.textColorPrimary
                };
            }
            final TypedArray typedArray = theme.obtainStyledAttributes(attrs);
            final int statusBarColor = typedArray.getColor(typedArray.getIndex(0),
                    ContextCompat.getColor(wrapper, R.color.primary_color_dark));
            final int iconColor = typedArray.getColor(typedArray.getIndex(1),
                    ContextCompat.getColor(wrapper, R.color.text_color_primary));
            typedArray.recycle();
            overflowMenuIcon.getDrawable().setColorFilter(iconColor, PorterDuff.Mode.SRC_ATOP);
            updateToolbarContainer(activity, preferenceManager.isBackgroundImageEnabled());
            activity.getWindow().setStatusBarColor(statusBarColor);
            final SystemBarTintManager tintManager = new SystemBarTintManager(activity);
            tintManager.setStatusBarTintEnabled(true);
            tintManager.setNavigationBarTintEnabled(true);
            tintManager.setTintColor(statusBarColor);
        } catch (NoInstanceException e) {
            Timber.e(e, "Null activity");
        }
    }

    void disableUrlBarScrolling() {
        // TODO Restore this
//        final AppBarLayout.LayoutParams params = (AppBarLayout.LayoutParams) toolbar.getLayoutParams();
//        params.setScrollFlags(0);
//        mContentContainer.requestLayout();
    }

    private void enableUrlBarScrolling() {
        // Todo Restore this
//        final AppBarLayout.LayoutParams params = (AppBarLayout.LayoutParams) toolbar.getLayoutParams();
//        params.setScrollFlags(AppBarLayout.LayoutParams.SCROLL_FLAG_SCROLL | AppBarLayout.LayoutParams.SCROLL_FLAG_SNAP);
//        mContentContainer.requestLayout();
    }

    private void showYTIcon() {
        if (ytDownloadIcon == null ||
                ytDownloadIcon.getVisibility() == View.VISIBLE ||
                state.getMode() == Mode.SEARCH) {
            return;
        }
        telemetry.sendYTIconVisibleSignal();
        ytDownloadIcon.setVisibility(View.VISIBLE);
    }

    void hideYTIcon() {
        if (ytDownloadIcon == null ||
                ytDownloadIcon.getVisibility() == View.GONE) {
            return;
        }
        ytDownloadIcon.setVisibility(View.GONE);
    }

    // TODO: dirty hack due to the Oreo multi-process WebView
    // Due to the loading page delay introduced to fix the multi-process WebView, we have to
    // open urls from history and favorites like they are initial urls (meaning similar logic).
    public void openFromOverview(CliqzMessages.OpenLink event) {
        mOverviewEvent = event;
    }

    void onDeleteTab() {
        if (lightningView != null) {
            lightningView.stopLoading();
            lightningView.onDestroy();
        }
    }

    void onPauseTab() {
        if (lightningView != null) {
            lightningView.onPause();
        }
    }

    void onResumeTab() {
        if (lightningView != null) {
            lightningView.onResume();
        }
    }

    @NonNull
    public String getUrl() {
        return lightningView != null ? lightningView.getUrl() : "";
    }

    @NonNull
    public String getTitle() {
        return lightningView != null ? lightningView.getTitle() : "";
    }

    public boolean isIncognito() {
        return lightningView != null && lightningView.isIncognitoTab();
    }

    @SuppressWarnings("SameParameterValue")
    void setShowWebPageAgain(boolean value) {
        mShowWebPageAgain = value;
    }
}
