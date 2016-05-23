package com.cliqz.browser.widget;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.Rect;
import android.graphics.drawable.Drawable;
import android.support.annotation.IdRes;
import android.support.annotation.StringRes;
import android.support.v4.content.ContextCompat;
import android.support.v4.graphics.drawable.DrawableCompat;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewParent;
import android.view.Window;
import android.widget.AdapterView;
import android.widget.BaseAdapter;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.ListPopupWindow;
import android.widget.ListView;
import android.widget.TextView;

import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.R;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.MainFragment;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

import static android.view.View.MeasureSpec.*;
import static android.view.View.MeasureSpec.getMode;
import static android.view.View.MeasureSpec.getSize;
import static android.view.View.MeasureSpec.makeMeasureSpec;

/**
 * Created by Ravjit on 03/02/16.
 */
public class OverFlowMenu extends FrameLayout {

    private static final String TAG = OverFlowMenu.class.getSimpleName();

    private enum Entries {
        ACTIONS(-1, -1),
        NEW_TAB(R.id.new_tab_menu_button, R.string.action_new_tab),
        NEW_INCOGNITO_TAB(R.id.new_incognito_tab_menu_button, R.string.action_incognito),
        COPY_LINK(R.id.copy_link_menu_button, R.string.action_copy),
        ADD_TO_FAVOURITES(R.id.add_to_favourites_menu_button, R.string.add_to_favourites),
        SETTINGS(R.id.settings_menu_button, R.string.settings),
        CONTACT_CLIQZ(R.id.contact_cliqz_menu_button, R.string.contact_cliqz),
        SAVE_LINK(R.id.save_link_menu_button, R.string.save_link);

        final int stringID;
        final int id;

        Entries(@IdRes int id, @StringRes int title) {
            this.id = id;
            this.stringID = title;
        }
    }

    private static final Entries[] ENTRIES = new Entries[] {
            Entries.ACTIONS,
            Entries.NEW_TAB,
            Entries.NEW_INCOGNITO_TAB,
            Entries.COPY_LINK,
            Entries.SAVE_LINK,
            Entries.ADD_TO_FAVOURITES,
            Entries.SETTINGS,
            Entries.CONTACT_CLIQZ
    };

    private static final Entries[] INCOGNITO_ENTRIES = new Entries[] {
            Entries.ACTIONS,
            Entries.SETTINGS,
            Entries.CONTACT_CLIQZ
    };

    private final Context context;
    private final OverFlowMenuAdapter overFlowMenuAdapter;
    private boolean mCanGoForward = false;
    private boolean mIncognitoMode;
    private long historyId;

    public View getAnchorView() {
        return mAnchorView;
    }

    public void setAnchorView(View mAnchorView) {
        this.mAnchorView = mAnchorView;
    }

    private View mAnchorView = null;

    private Entries[] mEntries = ENTRIES;

    private int mListViewWidth, mListViewHeight, mListViewY;

    @Inject
    Bus bus;

    @Bind(R.id.action_share)
    ImageView actionShareButton;

    @Bind(R.id.action_refresh)
    ImageView actionRefreshButton;

    @Bind(R.id.action_forward)
    ImageView actionForwardButton;

    @Inject
    CliqzBrowserState state;

    private final ListView listView;

    public OverFlowMenu(Context context) {
        super(context);
        this.context = context;
        listView = new ListView(context);
        this.addView(listView);
        ((MainActivity)context).mActivityComponent.inject(this);
        overFlowMenuAdapter = new OverFlowMenuAdapter();
        listView.setAdapter(overFlowMenuAdapter);
        listView.setOnItemClickListener(itemClickListener);
        final Drawable drawable = ContextCompat.getDrawable(context, android.R.drawable.dialog_holo_light_frame);
        listView.setBackground(drawable);
        listView.setDivider(null);
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        final int wMode = getMode(widthMeasureSpec);
        final int inWidth = getSize(widthMeasureSpec);
        final int hMode = getMode(heightMeasureSpec);
        final int inHeight = getSize(heightMeasureSpec);

        // Find position of the anchor view
        final int avX, avY, avW, avH;
        if (mAnchorView != null) {
            final int[] coords = new int[2];
            mAnchorView.getLocationOnScreen(coords);
            avX = coords[0];
            avY = coords[1];
            avW = mAnchorView.getWidth();
            avH = mAnchorView.getHeight();
        } else {
            avX = 0;
            avY = 0;
            avW = inWidth;
            avH = 0;
        }

        mListViewWidth = Math.min(inWidth, inHeight) * 2 / 3;
        mListViewHeight = inHeight - avY - avH;
        mListViewY = avY + avH / 2;

        final int measuredListHeight = measureListViewContent(mListViewWidth, mListViewHeight);

        mListViewHeight = Math.min(mListViewHeight, measuredListHeight);

        final int lvW = makeMeasureSpec(mListViewWidth, EXACTLY);
        final int lvH = makeMeasureSpec(mListViewHeight, EXACTLY);
        listView.measure(lvW, lvH);
        setMeasuredDimension(widthMeasureSpec, heightMeasureSpec);
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
        final int result = firstRow.getMeasuredHeight() + (overFlowMenuAdapter.getCount() - 1) *
                otherRow.getMeasuredHeight() + drawablePadding.top + drawablePadding.bottom;
        return result;
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

        final int listViewX = right - mListViewWidth;
        listView.layout(listViewX, mListViewY, right, mListViewY + mListViewHeight);
    }

    public boolean canGoForward() {
        return mCanGoForward;
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
        mEntries = mIncognitoMode ? INCOGNITO_ENTRIES : ENTRIES;
        overFlowMenuAdapter.notifyDataSetInvalidated();
    }

    public void setHistoryId(long historyId) {
        this.historyId = historyId;
    }

    private class OverFlowMenuAdapter extends BaseAdapter {

        // private String[] menuItems;

//        public OverFlowMenuAdapter() {
//            menuItems = context.getResources().getStringArray(R.array.overflow_menu);
//        }

        @Override
        public int getCount() {
            return mEntries.length;
        }

        @Override
        public int getViewTypeCount() {
            return 2;
        }

        @Override
        public int getItemViewType(int position) {
            switch (mEntries[position]) {
                case ACTIONS:
                    return 0;
                default:
                    return 1;
            }
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
            final boolean isAddToFavourites = mEntries[position] == Entries.ADD_TO_FAVOURITES;
            final boolean isCopyLink = mEntries[position] == Entries.COPY_LINK;
            final boolean isSaveLink = mEntries[position] == Entries.SAVE_LINK;
            final boolean hasValidId = historyId != -1;
            final boolean isShowingWebPage = state.getMode() == Mode.WEBPAGE;

            return (!isAddToFavourites && !isCopyLink && !isSaveLink) ||
                    (isAddToFavourites && hasValidId && isShowingWebPage) ||
                    (isCopyLink && isShowingWebPage) ||
                    (isSaveLink && isShowingWebPage);
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            View view = convertView;
            final Mode mode = state.getMode();
            if(view == null) {
                LayoutInflater inflater = (LayoutInflater) context.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
                if(position == 0) {
                    view = inflater.inflate(R.layout.overflow_menu_header, parent, false);
                    ButterKnife.bind(OverFlowMenu.this, view);
                    if(mode == Mode.SEARCH) {
                        setButtonDisabled(actionRefreshButton);
                        //setButtonDisabled(actionShareButton);
                    } else {
                        setButtonEnabled(actionRefreshButton);
                        //setButtonEnabled(actionShareButton);
                    }
                    if (!mCanGoForward) {
                        setButtonDisabled(actionForwardButton);
                    } else {
                        setButtonEnabled(actionForwardButton);
                    }
                } else {
                    view = inflater.inflate(android.R.layout.simple_list_item_1, parent, false);
                }
            }

            if(mEntries[position] == Entries.ACTIONS) {
                view.setTag(mEntries[position]);
            } else {
                final Entries entry = mEntries[position];
                TextView option = getEntryTextView(view);
                option.setText(entry.stringID);
                view.setTag(entry);
                view.setId(entry.id);
                option.setTextColor(ContextCompat.getColor(context, R.color.black));
                if(!isEnabled(position)) {
                    option.setTextColor(ContextCompat.getColor(context, R.color.hint_text));
                }
            }
            return view;
        }

        private TextView getEntryTextView(final View view) {
            final TextView result;
            if (view instanceof TextView) {
                result = (TextView) view;
            } else {
                result = (TextView) view.findViewById(android.R.id.text1);
            }
            return result;
        }

        private void setButtonDisabled(final ImageView view) {
            view.setEnabled(false);
            final int color = ContextCompat.getColor(context, R.color.hint_text);
            view.getDrawable().setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        }

        private void setButtonEnabled(final ImageView view) {
            view.setEnabled(true);
            final int color = ContextCompat.getColor(context, R.color.black);
            view.getDrawable().setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        }

    }

    public void show() {
        if (mAnchorView == null) {
            throw new RuntimeException("Must be anchored");
        }

        final ViewGroup root = (ViewGroup) mAnchorView.getRootView();
        root.addView(this);
    }

    public void dismiss() {
        if (mAnchorView == null) {
            throw new RuntimeException("Must be anchored");
        }

        final ViewParent parent = this.getParent();
        if (parent != null) {
            ((ViewGroup) parent).removeView(this);
        }
    }

    private AdapterView.OnItemClickListener itemClickListener = new AdapterView.OnItemClickListener() {
        @Override
        public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
            final Entries tag = (Entries)view.getTag();
            Log.e(TAG, "Entry id: " + tag.id);
            switch (tag) {
                case COPY_LINK:
                    bus.post(new Messages.CopyUrl());
                    OverFlowMenu.this.dismiss();
                    break;
                case SETTINGS:
                    bus.post(new Messages.GoToSettings());
                    OverFlowMenu.this.dismiss();
                    break;
                case CONTACT_CLIQZ:
                    bus.post(new Messages.ContactCliqz());
                    OverFlowMenu.this.dismiss();
                    break;
                case NEW_INCOGNITO_TAB:
                    bus.post(new BrowserEvents.NewTab(true));
                    OverFlowMenu.this.dismiss();
                    break;
                case NEW_TAB:
                    bus.post(new BrowserEvents.NewTab(false));
                    OverFlowMenu.this.dismiss();
                    break;
                case ADD_TO_FAVOURITES:
                    bus.post(new Messages.AddToFavourites(historyId));
                    OverFlowMenu.this.dismiss();
                    break;
                case SAVE_LINK:
                    bus.post(new Messages.SaveLink());
                    OverFlowMenu.this.dismiss();
            }
        }
    };

    @OnClick(R.id.action_forward)
    void onForwardClicked() {
        bus.post(new Messages.GoForward());
        this.dismiss();
    }

    @OnClick(R.id.action_refresh)
    void onRefreshClicked() {
        bus.post(new Messages.ReloadPage());
        this.dismiss();
    }

    @OnClick(R.id.action_share)
    void onShareClicked() {
        bus.post(new Messages.ShareLink());
        this.dismiss();
    }

    /* @Override
    public void show() {
        super.show();
        ViewParent v = this.getListView();
        while (v != null) {
            Log.e(TAG, dump(v));
            v = v.getParent();
        }
    }

    private static String dump(ViewParent viewParent) {
        int id = -1;
        try {
            id = ((View) viewParent).getId();
        } catch (ClassCastException e) {

        }

        return String.format("%s (%d) [%d]", viewParent.getClass().getCanonicalName(), id, viewParent.hashCode());
    } */
}
