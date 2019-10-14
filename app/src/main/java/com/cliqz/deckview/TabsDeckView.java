package com.cliqz.deckview;

import android.content.Context;
import android.content.res.Configuration;
import android.content.res.TypedArray;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.ItemTouchHelper;
import android.util.AttributeSet;
import android.widget.FrameLayout;

import com.cliqz.browser.R;
import com.cliqz.browser.tabs.Tab;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.jsengine.Engine;

import java.util.ArrayList;

import javax.inject.Inject;

/**
 * @author Stefano Pacifici
 */
public class TabsDeckView extends FrameLayout {

    @Inject
    Engine engine;

    private RecyclerView recyclerView;

    final ArrayList<Tab> entries = new ArrayList<>();

    // Store the current card, it's used only on screen rotations
    private int mCurrentCard = 0;

    private TabsDeckViewAdapter adapter;

    private TabsDeckViewListener mListener = null;


    // The cards remainder size
    int mRemainderSize;
    int mDeckPadding;

    public void setSelectedTab(int position) {
        adapter.setSelectedTab(position);
    }

    public interface TabsDeckViewListener {
        void onTabClosed(int position, Tab state);

        void onTabClicked(int position, Tab state);
    }

    public void setListener(TabsDeckViewListener listener) {
        this.mListener = listener;
    }

    public TabsDeckView(Context context) {
        super(context);
        init(context, null);
    }

    public TabsDeckView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init(context, attrs);
    }

    public TabsDeckView(Context context, @Nullable AttributeSet attrs, int defStyle) {
        super(context, attrs, defStyle);
        init(context, attrs);
    }

    private void init(Context context, AttributeSet attrs) {
        //noinspection ConstantConditions
        ((MainActivity) context).getActivityComponent().inject(this);

        final TypedArray typedArray = context.obtainStyledAttributes(attrs, R.styleable.TabsDeckView,
                0, R.style.Widget_Cliqz_TabsDeckView);
        mRemainderSize = typedArray.getDimensionPixelSize(R.styleable.TabsDeckView_remainderSize, 0);
        mDeckPadding = typedArray.getDimensionPixelSize(R.styleable.TabsDeckView_deckPadding, 0);
        typedArray.recycle();

        createViews(context);
    }

    private void createViews(Context context) {
        recyclerView = new RecyclerView(context);
        adapter = new TabsDeckViewAdapter(this);

        recyclerView.setAdapter(adapter);
        recyclerView.setLayoutManager(new DeckLayoutManager(this));
        addView(recyclerView);
        final ItemTouchHelper.SimpleCallback swipeToDeleteCallback = new SwipeToDeleteCallback(this);
        final ItemTouchHelper itemTouchHelper = new ItemTouchHelper(swipeToDeleteCallback);
        itemTouchHelper.attachToRecyclerView(recyclerView);
    }

    public void scrollToCard(int position) {
        mCurrentCard = position;
        recyclerView.scrollToPosition(position);
    }

    void closeTab(int position) {
        final Tab state = adapter.remove(position);
        if (mListener == null || state == null) {
            return;
        }
        mListener.onTabClosed(position, state);
    }

    void onTabClicked(int position) {
        if (mListener == null) {
            return;
        }
        final Tab state = entries.get(position);
        mListener.onTabClicked(position, state);
    }

    public void refreshEntries(ArrayList<Tab> entries) {
        this.entries.clear();
        this.entries.addAll(entries);
        adapter.notifyDataSetChanged();
    }

    @Override
    protected void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        removeAllViews();
        createViews(getContext());
        recyclerView.scrollToPosition(mCurrentCard);
    }
}
