package com.cliqz.browser.widget;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.PorterDuff;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.CheckedTextView;
import android.widget.CompoundButton;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ListView;
import android.widget.TextView;
import android.widget.Toast;
import android.widget.ToggleButton;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.StringRes;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.appcompat.widget.AppCompatImageButton;
import androidx.core.content.ContextCompat;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.qrscanner.CodeScannerActivity;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.cliqz.utils.ContextUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.database.HistoryDatabase;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;
import butterknife.Optional;
import timber.log.Timber;

import static android.view.View.MeasureSpec.AT_MOST;
import static android.view.View.MeasureSpec.EXACTLY;
import static android.view.View.MeasureSpec.getSize;
import static android.view.View.MeasureSpec.makeMeasureSpec;

/**
 * Display a "dropdown menu", the class contains also the logic to show the proper entries when
 * shown in ForgetTab mode.
 *
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
@SuppressLint("ViewConstructor")
public class OverFlowMenu extends FrameLayout {

    private enum EntryType {
        ACTIONS,
        MULTICHOICE,
        REGULAR,
    }

    private enum Entries {
        ACTIONS(EntryType.ACTIONS, -1, -1),
        NEW_TAB(EntryType.REGULAR, R.id.new_tab_menu_button, R.string.action_new_tab),
        NEW_INCOGNITO_TAB(EntryType.REGULAR, R.id.new_incognito_tab_menu_button, R.string.action_incognito),
        TABS(EntryType.REGULAR, R.id.tabs_menu_button, R.string.tabs_word),
        GO_TO_FAVORITES(EntryType.REGULAR, R.id.go_to_favorites_button, R.string.favorites),

        SEARCH_IN_PAGE(EntryType.REGULAR, R.id.search_on_page_menu_button, R.string.action_search_on_page),
        SETTINGS(EntryType.REGULAR, R.id.settings_menu_button, R.string.settings),
        REACT_DEBUG(EntryType.REGULAR, R.id.react_debug, R.string.debug_react_native),
        REQUEST_DESKTOP_SITE(EntryType.MULTICHOICE, R.id.request_desktop_site, R.string.request_desktop_site),
        QUIT(EntryType.REGULAR, R.id.quit_menu_button, R.string.exit),
        CODE_SCANNER(EntryType.REGULAR, R.id.code_scanner, R.string.code_scanner),
        SEND_TAB_TO_DESKTOP(EntryType.REGULAR, R.id.send_tab_menu_button, R.string.send_tab_to_desktop),
        SET_DEFAULT_BROWSER(EntryType.REGULAR, R.id.set_default_browser, R.string.set_default_browser);

        final EntryType type;
        final int stringID;
        final int id;

        Entries(@NonNull EntryType type, @IdRes int id, @StringRes int title) {
            this.type = type;
            this.id = id;
            this.stringID = title;
        }
    }

    private static final Entries[] ENTRIES = new Entries[] {
            Entries.ACTIONS,
            Entries.NEW_TAB,
            Entries.NEW_INCOGNITO_TAB,
            Entries.TABS,
            Entries.SEARCH_IN_PAGE,
            Entries.GO_TO_FAVORITES,
            Entries.SEND_TAB_TO_DESKTOP,
            Entries.SET_DEFAULT_BROWSER,
            Entries.CODE_SCANNER,
            Entries.SETTINGS,
            Entries.REQUEST_DESKTOP_SITE,
            Entries.REACT_DEBUG,
            Entries.QUIT
    };

    private static final Entries[] INCOGNITO_ENTRIES = new Entries[] {
            Entries.ACTIONS,
            Entries.NEW_TAB,
            Entries.NEW_INCOGNITO_TAB,
            Entries.TABS,
            Entries.SEARCH_IN_PAGE,
            Entries.SEND_TAB_TO_DESKTOP,
            Entries.SET_DEFAULT_BROWSER,
            Entries.CODE_SCANNER,
            Entries.SETTINGS,
            Entries.REQUEST_DESKTOP_SITE,
            Entries.QUIT
    };

    private final class CameraPermissionResult extends PermissionsResultAction {

        @Override
        public void onGranted() {
            startCodeScanner();
        }

        @Override
        public void onDenied(String permission) {
            // nothing to do here
        }
    }

    private final Activity activity;
    private final OverFlowMenuAdapter overFlowMenuAdapter;
    private boolean mCanGoForward = false;
    private boolean mIncognitoMode = false;
    private boolean mDesktopSiteEnabled = false;
    private boolean mIsFreshTabVisible = false;
    private boolean mIsFavorite = false;
    private String mUrl;
    private String mTitle;

    // Used to store content view width and height to avoid problems with the navigation bar
    private final Rect contentRect = new Rect();

    @SuppressWarnings("unused")
    public View getAnchorView() {
        return mAnchorView;
    }

    public void setAnchorView(View mAnchorView) {
        this.mAnchorView = mAnchorView;
    }

    private View mAnchorView = null;

    private Entries[] mEntries = null;

    private int mListViewWidth, mListViewHeight, mListViewY;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    TabsManager tabsManager;

    @Inject
    Engine engine;

    @BindView(R.id.action_refresh)
    AppCompatImageButton actionRefreshButton;

    @BindView(R.id.action_forward)
    AppCompatImageButton actionForwardButton;

    @BindView(R.id.toggle_favorite)
    ToggleButton toggleFavorite;

    @Nullable
    @BindView(R.id.action_share)
    AppCompatImageButton actionShare;

    @Nullable
    @BindView(R.id.open_tabs_count)
    TabsCounter tabsCounter;

    private CliqzBrowserState state;
    private final ListView listView;

    public OverFlowMenu(Activity activity) {
        super(activity);
        this.activity = activity;
        prepareEntries();
        listView = new ListView(activity);
        listView.setId(R.id.overflow_menu_list);
        this.addView(listView);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(activity);
        if (component != null) {
            component.inject(this);
        }
        overFlowMenuAdapter = new OverFlowMenuAdapter();
        listView.setAdapter(overFlowMenuAdapter);
        listView.setOnItemClickListener(new MenuItemClickListener());
        final Drawable drawable = AppCompatResources.getDrawable(activity, android.R.drawable.dialog_holo_light_frame);
        listView.setBackground(drawable);
        listView.setDivider(null);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        final int inWidth = getSize(widthMeasureSpec);
        final int inHeight = getSize(heightMeasureSpec);

        final Context context = getContext();
        final int statusBarHeight = ContextUtils.getStatusBarHeight(context);
        final int navigationBarHeight = ContextUtils.getNavigationBarHeight(context);
        mListViewWidth = Math.min(inWidth, inHeight) * 2 / 3;
        mListViewHeight = inHeight - statusBarHeight - navigationBarHeight;
        mListViewY = statusBarHeight;

        final int measuredListHeight = measureListViewContent(mListViewWidth, mListViewHeight);

        mListViewHeight = Math.min(mListViewHeight, measuredListHeight);

        final int lvW = makeMeasureSpec(mListViewWidth, EXACTLY);
        final int lvH = makeMeasureSpec(mListViewHeight, EXACTLY);
        listView.measure(lvW, lvH);
        setMeasuredDimension(widthMeasureSpec, heightMeasureSpec);
    }

    @Override
    protected void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        telemetry.sendOverflowMenuHideSignal(isIncognitoMode(),
                state.getMode() == Mode.SEARCH ? TelemetryKeys.CARDS : TelemetryKeys.WEB);
    }

    private int measureListViewContent(int maxWidth, int maxHeight) {
        final View firstRow = overFlowMenuAdapter.getView(0, null, listView);
        final View otherRow = overFlowMenuAdapter.getView(1, null, listView);
        final int widthMeasureSpec = makeMeasureSpec(maxWidth, AT_MOST);
        final int heightMeasureSpec = makeMeasureSpec(maxHeight, AT_MOST);
        firstRow.measure(widthMeasureSpec, heightMeasureSpec);
        otherRow.measure(widthMeasureSpec, heightMeasureSpec);

        final Drawable background = listView.getBackground();
        final Rect drawablePadding = new Rect();
        background.getPadding(drawablePadding);
        return firstRow.getMeasuredHeight() + (overFlowMenuAdapter.getCount() - 1) *
                otherRow.getMeasuredHeight() + drawablePadding.top + drawablePadding.bottom;
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (!super.dispatchTouchEvent(ev)) {
            dismiss();
        }
        return true;
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        if (!changed) {
            return;
        }

        // right is the DecorView right here, it means the latter may contain the navigation bar
        // so we have to use the contentRect right coordinate instead
        final int listViewX = contentRect.right - mListViewWidth;
        listView.layout(listViewX, mListViewY, contentRect.right, mListViewY + mListViewHeight);
    }

    public void setCanGoForward(boolean value) {
        this.mCanGoForward = value;
        overFlowMenuAdapter.notifyDataSetChanged();
    }

    public boolean isIncognitoMode() {
        return mIncognitoMode;
    }

    public void setIncognitoMode(boolean newValue) {
        mIncognitoMode = newValue;
        prepareEntries();
        overFlowMenuAdapter.notifyDataSetInvalidated();
    }

    public void setDesktopSiteEnabled(boolean isEnabled) {
        mDesktopSiteEnabled = isEnabled;
    }

    private void prepareEntries() {
        List<Entries> entries = new ArrayList<>(
                Arrays.asList(mIncognitoMode ? INCOGNITO_ENTRIES : ENTRIES));

        if (BuildConfig.IS_LUMEN) {
            entries.remove(Entries.SEND_TAB_TO_DESKTOP);
        }
        if (BuildConfig.IS_NOT_LUMEN) {
            entries.remove(Entries.TABS);
        }
        if (!BuildConfig.DEBUG) {
            entries.remove(Entries.REACT_DEBUG);
        }
        if (checkIfDefaultBrowserSetIsCliqz(getContext())) {
            entries.remove(Entries.SET_DEFAULT_BROWSER);
        }
        mEntries = entries.toArray(new Entries[0]);
    }

    public void setIsFreshTabVisible(boolean visible) {
        this.mIsFreshTabVisible = visible;
    }

    public void setUrl(String url) {
        this.mUrl = url;
    }

    public void setTitle(String title) {
        this.mTitle = title;
    }

    public void setState(CliqzBrowserState state) {
        this.state = state;
    }

    public void setFavorite(boolean value) {
        mIsFavorite = value;
    }

    private class OverFlowMenuAdapter extends BaseAdapter {

        @Override
        public int getCount() {
            return mEntries.length;
        }

        @Override
        public int getViewTypeCount() {
            // Actions, Desktop Site, regulat entries
            return EntryType.values().length;
        }

        @Override
        public int getItemViewType(int position) {
            return mEntries[position].type.ordinal();
        }

        @Override
        public Object getItem(int position) {
            return mEntries[position];
        }

        @Override
        public long getItemId(int position) {
            return mEntries[position].ordinal();
        }

        @Override
        public boolean areAllItemsEnabled() {
            return false;
        }

        @Override
        public boolean isEnabled(int position) {
            final Entries entry = mEntries[position];
            final boolean hasValidId = mUrl != null &&  !mUrl.isEmpty() && !mUrl.contains("cliqz://trampoline");
            final boolean isShowingWebPage = state.getMode() == Mode.WEBPAGE;
            final boolean isSearchInPage = mEntries[position] == Entries.SEARCH_IN_PAGE;
            final boolean isSendTab = entry == Entries.SEND_TAB_TO_DESKTOP;
            return (!isSearchInPage && !isSendTab) ||
                    (hasValidId && isShowingWebPage) ||
                    (isSearchInPage && isShowingWebPage) ||
                    (isSendTab && isShowingWebPage);
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            View view = convertView;
            final Mode mode = state.getMode();
            if(view == null) {
                LayoutInflater inflater = LayoutInflater.from(parent.getContext());
                switch (mEntries[position].type) {
                    case ACTIONS:
                        view = inflater.inflate(R.layout.overflow_menu_header, parent, false);
                        ButterKnife.bind(OverFlowMenu.this, view);
                        final Drawable favoriteDrawable = AppCompatResources.getDrawable(getContext(), R.drawable.ic_favorite);
                        toggleFavorite.setBackgroundDrawable(favoriteDrawable);
                        if(mode == Mode.SEARCH) {
                            setButtonDisabled(actionRefreshButton);
                            toggleFavorite.setEnabled(false);

                            if (mIsFreshTabVisible) {
                                setButtonDisabled(actionShare);
                            } else {
                                setButtonEnabled(actionShare);
                            }
                        } else {
                            setButtonEnabled(actionRefreshButton);
                            setButtonEnabled(actionShare);
                            toggleFavorite.setOnCheckedChangeListener(null);
                            toggleFavorite.setEnabled(!mUrl.contains("cliqz://trampoline"));
                            toggleFavorite.setChecked(mIsFavorite);
                            toggleFavorite.setOnCheckedChangeListener(onCheckedChangeListener);
                        }
                        if (!mCanGoForward) {
                            setButtonDisabled(actionForwardButton);
                        } else {
                            setButtonEnabled(actionForwardButton);
                        }
                        if (tabsCounter != null) {
                            tabsCounter.setCounter(tabsManager.getTabCount());
                        }
                        break;
                    case MULTICHOICE:
                        view = inflater.inflate(android.R.layout.simple_list_item_multiple_choice, parent, false);
                        break;
                    default:
                        view = inflater.inflate(android.R.layout.simple_list_item_1, parent, false);
                        break;
                }
            }

            if(mEntries[position] == Entries.ACTIONS) {
                view.setTag(mEntries[position]);
            } else if (mEntries[position] == Entries.REQUEST_DESKTOP_SITE) {
                final Entries entry = mEntries[position];
                final CheckedTextView option = getCheckedTextView(view);
                if (option != null) {
                    option.setText(entry.stringID);
                    option.setChecked(mDesktopSiteEnabled);
                    view.setTag(entry);
                    view.setId(entry.id);
                    option.setTextColor(ContextCompat.getColor(activity, R.color.black));
                }
            } else {
                final Entries entry = mEntries[position];
                final TextView option = getEntryTextView(view);
                option.setText(entry.stringID);
                view.setTag(entry);
                view.setId(entry.id);
                option.setTextColor(ContextCompat.getColor(activity, R.color.black));
                if(!isEnabled(position)) {
                    option.setTextColor(ContextCompat.getColor(activity, R.color.hint_text));
                }
            }
            return view;
        }

        @SuppressWarnings("RedundantCast")
        private TextView getEntryTextView(final View view) {
            final TextView result;
            if (view instanceof TextView) {
                result = (TextView) view;
            } else {
                result = (TextView) view.findViewById(android.R.id.text1);
            }
            return result;
        }

        @SuppressWarnings("RedundantCast")
        @Nullable
        private CheckedTextView getCheckedTextView(final View view) {
            final CheckedTextView result;
            if (view instanceof CheckedTextView) {
                result = (CheckedTextView) view;
            } else {
                result = (CheckedTextView) view.findViewById(android.R.id.text1);
            }
            return result;
        }

        private void setButtonDisabled(final @Nullable ImageView view) {
            if (view == null) {
                return;
            }
            view.setEnabled(false);
            final int color = ContextCompat.getColor(activity, R.color.hint_text);
            view.getDrawable().setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        }

        private void setButtonEnabled(final @Nullable ImageView view) {
            if (view == null) {
                return;
            }
            view.setEnabled(true);
            final int color = ContextCompat.getColor(activity, R.color.black);
            view.getDrawable().setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        }

    }

    @SuppressWarnings("RedundantCast")
    public void show() {
        if (mAnchorView == null) {
            throw new RuntimeException("Must be anchored");
        }

        final ViewGroup root = (ViewGroup) mAnchorView.getRootView();
        final ViewGroup contentView = (ViewGroup) root.findViewById(android.R.id.content);
        final boolean hasContentRect = contentView != null &&
                contentView.getGlobalVisibleRect(contentRect);
        if (!hasContentRect) {
            root.getGlobalVisibleRect(contentRect);
        }
        if (tabsCounter != null) {
            tabsCounter.setCounter(tabsManager.getTabCount());
        }
        root.addView(this);
        bus.register(this);
    }

    public void dismiss() {
        if (mAnchorView == null) {
            throw new RuntimeException("Must be anchored");
        }

        final ViewParent parent = this.getParent();
        if (parent != null) {
            ((ViewGroup) parent).removeView(this);
        }
        bus.unregister(this);
    }

    private class MenuItemClickListener implements AdapterView.OnItemClickListener {

        @Override
        public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
            final Entries tag = (Entries)view.getTag();
            Timber.e("Entry id: %s", tag.id);
            switch (tag) {
                case SETTINGS:
                    telemetry.sendMainMenuSignal(TelemetryKeys.SETTINGS, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new Messages.GoToSettings());
                    break;
                case NEW_INCOGNITO_TAB:
                    telemetry.sendMainMenuSignal(TelemetryKeys.NEW_FORGET_TAB, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new BrowserEvents.NewTab(true));
                    break;
                case NEW_TAB:
                    telemetry.sendMainMenuSignal(TelemetryKeys.NEW_TAB, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new BrowserEvents.NewTab(false));
                    break;
                case TABS:
                    telemetry.sendMainMenuSignal(TelemetryKeys.TAB_COUNT, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new Messages.GoToOverview());
                    break;
                case SEARCH_IN_PAGE:
                    telemetry.sendMainMenuSignal(TelemetryKeys.PAGE_SEARCH, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new BrowserEvents.SearchInPage());
                    break;
                case GO_TO_FAVORITES:
                    bus.post(new Messages.GoToFavorites());
                    break;
                case REQUEST_DESKTOP_SITE:
                    mDesktopSiteEnabled = !mDesktopSiteEnabled;
                    bus.post(new Messages.ChangeUserAgent(mDesktopSiteEnabled));
                    break;
                case QUIT:
                    telemetry.sendMainMenuSignal(TelemetryKeys.QUIT, isIncognitoMode(),
                            state.getMode() == Mode.SEARCH ? "cards" : "web");
                    bus.post(new Messages.Quit());
                    break;
                case SEND_TAB_TO_DESKTOP:
                    telemetry.sendMainMenuSignal(TelemetryKeys.SEND_TAB, isIncognitoMode(), "web");
                    bus.post(new Messages.SentTabToDesktop());
                    break;
                case SET_DEFAULT_BROWSER:
                    final String url = "https://cliqz.com/magazine";
                    final Intent openBrowserIntent = new Intent(Intent.ACTION_VIEW,
                            Uri.parse(url));
                    if (checkIfDefaultBrowserSetForDevice(getContext(), openBrowserIntent)) {
                        final Intent defaultAppsIntent = new Intent(Settings.ACTION_MANAGE_DEFAULT_APPS_SETTINGS);
                        activity.startActivity(defaultAppsIntent);
                    } else {
                        final Toast setDefaultBrowserToast = Toast.makeText(getContext(),
                                R.string.set_default_browser_msg, Toast.LENGTH_LONG);
                        setDefaultBrowserToast.setGravity(Gravity.CENTER, 0, 0);
                        setDefaultBrowserToast.show();
                        activity.startActivity(openBrowserIntent);
                    }
                    break;
                case CODE_SCANNER:
                    if (PermissionsManager.hasPermission(activity, Manifest.permission.CAMERA)) {
                        startCodeScanner();
                    } else {
                        PermissionsManager
                                .getInstance()
                                .requestPermissionsIfNecessaryForResult(activity,
                                        new CameraPermissionResult(), Manifest.permission.CAMERA);
                    }
                    break;
                case REACT_DEBUG:
                    engine.showDebugMenu();
                    break;
                default:
                    break;
            }
            OverFlowMenu.this.dismiss();
        }
    }

    private void startCodeScanner() {
        final Intent codeScannerIntent = new Intent(activity, CodeScannerActivity.class);
        activity.startActivity(codeScannerIntent);
    }

    @OnClick(R.id.action_forward)
    void onForwardClicked() {
        telemetry.sendMainMenuSignal(TelemetryKeys.FORWARD, isIncognitoMode(),
                state.getMode() == Mode.SEARCH ? "cards" : "web");
        bus.post(new Messages.GoForward());
        this.dismiss();
    }

    @OnClick(R.id.action_refresh)
    void onRefreshClicked() {
        telemetry.sendMainMenuSignal(TelemetryKeys.REFRESH, isIncognitoMode(),
                state.getMode() == Mode.SEARCH ? "cards" : "web");
        bus.post(new Messages.ReloadPage());
        this.dismiss();
    }

    @Optional
    @OnClick(R.id.action_share)
    void onShareClicked() {
        telemetry.sendMainMenuSignal(TelemetryKeys.SHARE, isIncognitoMode(),
                state.getMode() == Mode.SEARCH ? "cards" : "web");
        bus.post(new Messages.ShareLink());
        this.dismiss();
    }

    @Optional
    @OnClick(R.id.open_tabs_count)
    void onTabsCounterClicked() {
        telemetry.sendMainMenuSignal(TelemetryKeys.TAB_COUNT, isIncognitoMode(),
                state.getMode() == Mode.SEARCH ? "cards" : "web");
        bus.post(new Messages.GoToOverview());
        dismiss();
    }

    @Subscribe
    void onUpdateUrl(BrowserEvents.UpdateUrl event) {
        if (event.url.contains("cliqz://trampoline")) {
            return;
        }
        mUrl = event.url;
        toggleFavorite.setEnabled(true);
        boolean isFavorite = historyDatabase.isFavorite(mUrl);
        if (mIsFavorite != isFavorite) {
            toggleFavorite.setChecked(isFavorite);
            mIsFavorite = isFavorite;
        }
    }

    private boolean checkIfDefaultBrowserSetIsCliqz(Context context) {
        final String url = "https://cliqz.com/magazine";
        final Intent intent = new Intent(Intent.ACTION_VIEW,
                Uri.parse(url));
        final PackageManager packageManager = context.getPackageManager();
        final ResolveInfo defaultResolveInfo = packageManager.resolveActivity(intent, 0);
        return BuildConfig.APPLICATION_ID.equals(defaultResolveInfo.activityInfo.packageName);
    }

    private boolean checkIfDefaultBrowserSetForDevice(Context context, Intent intent) {
        final PackageManager packageManager = context.getPackageManager();
        final ResolveInfo defaultResolveInfo = packageManager.resolveActivity(intent, 0);
        List<ResolveInfo> resolveInfoList = packageManager.queryIntentActivities(intent, 0);
        for (ResolveInfo resolveInfo : resolveInfoList) {
            if (resolveInfo.activityInfo.packageName.equals(defaultResolveInfo.activityInfo.packageName)
                && resolveInfo.activityInfo.name.equals(defaultResolveInfo.activityInfo.name)) {
                return true;
            }
        }
        return false;
    }

    private CompoundButton.OnCheckedChangeListener onCheckedChangeListener = new CompoundButton.OnCheckedChangeListener() {
        @Override
        public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
            if (isChecked) {
                telemetry.sendMainMenuSignal(TelemetryKeys.ADD_FAVORITE, isIncognitoMode(),
                        TelemetryKeys.WEB);
                historyDatabase.setFavorites(mUrl, mTitle, System.currentTimeMillis(), true);
                Toast.makeText(getContext(), R.string.added_to_favorites, Toast.LENGTH_SHORT).show();
            } else {
                telemetry.sendMainMenuSignal(TelemetryKeys.REMOVE_FROM_FAVORITE, isIncognitoMode(),
                        TelemetryKeys.WEB);
                historyDatabase.setFavorites(mUrl, mTitle, System.currentTimeMillis(), false);
                Toast.makeText(getContext(), "Removed from favorites", Toast.LENGTH_SHORT).show();
            }
            OverFlowMenu.this.dismiss();
        }
    };
}
