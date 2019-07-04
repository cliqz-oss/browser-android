package com.cliqz.browser.main;

import android.database.Cursor;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import androidx.annotation.Nullable;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.overview.OverviewTabsEnum;
import com.cliqz.browser.main.HistoryAdapter;
import com.cliqz.browser.starttab.HistoryItemTouchHelper;
import com.cliqz.nove.Subscribe;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
public class HistoryFragment extends FragmentWithBus {

    private boolean isMultiSelect;
    private HistoryAdapter adapter;
    private View contextualToolBar;
    // private TextView contextualToolBarTitle;

    @BindView(R.id.history_rview)
    RecyclerView historyListView;

    @BindView(R.id.no_history_ll)
    LinearLayout noHistoryMessage;

    @Override
    public View onCreateView(@NotNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        contextualToolBar = Objects
                .requireNonNull((OverviewFragment)getParentFragment())
                .contextualToolBar;
        // contextualToolBarTitle = contextualToolBar.findViewById(R.id.contextual_title);
        final View view = inflater.inflate(R.layout.fragment_history, container, false);
        ButterKnife.bind(this,view);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getContext());
        Objects.requireNonNull(component).inject(this);
        adapter = new HistoryAdapter(engine, handler, bus);
        return view;
    }

    @Override
    public void onStart() {
        super.onStart();
        //TODO reintroduce telemetry
        /*telemetry.sendLayerChangeSignal("past");
        final PreferenceManager.ClearQueriesOptions clear = preferenceManager.shouldClearQueries();
        if (clear != PreferenceManager.ClearQueriesOptions.NO) {
            mHistoryWebView.cleanupQueries(clear);
            preferenceManager.setShouldClearQueries(PreferenceManager.ClearQueriesOptions.NO);
        }*/
        prepareListData();
        if (adapter.getItemCount() == 0) {
            noHistoryMessage.setVisibility(View.VISIBLE);
            return;
        }
        noHistoryMessage.setVisibility(View.GONE);
        if (adapter == null) {
            adapter = new HistoryAdapter(engine, handler, bus);
        }
        prepareRecyclerView();
    }

    @Override
    public void onStop() {
        super.onStop();
        hideContextualMenu();
    }

    @Subscribe
    public void onOverviewTabSwitched(Messages.OnOverviewTabSwitched event) {
        if (event.position != OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            hideContextualMenu();
        }
    }

    @Subscribe
    public void onContextualBarCanceled(Messages.OnContextualBarCancelPressed event) {
        final int pageIndex = Objects
                .requireNonNull((OverviewFragment)getParentFragment())
                .getCurrentPageIndex();
        if (pageIndex == OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            hideContextualMenu();
        }
    }

    @Subscribe
    public void onContextualBarDelete(Messages.OnContextualBarDeletePressed event) {
        // TODO restore this
        /*
        final int pageIndex = Objects
                .requireNonNull((OverviewFragment)getParentFragment())
                .getCurrentPageIndex();
        if (pageIndex == OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            deleteSelectedItems();
        }
        */
    }

    private void prepareRecyclerView() {
        final View view = getView();
        if (view == null) {
            return;
        }
        historyListView.setLayoutManager(new LinearLayoutManager(getContext()));

        //callback to handle swipe and delete
        final ItemTouchHelper itemTouchHelper = new ItemTouchHelper(new HistoryItemTouchHelper(historyDatabase, adapter));
        itemTouchHelper.attachToRecyclerView(historyListView);
        historyListView.setAdapter(adapter);
        historyListView.scrollToPosition(adapter.getItemCount()-1);
    }

    private void prepareListData() {
        //TODO historyDatabase.getHistoryItemsCount has to be modified to get the limit correctly;
        final int itemsCount = historyDatabase.getHistoryItemsCount();
        final ArrayList<HistoryModel> historyList = new ArrayList<>(itemsCount);
        final Cursor cursor = historyDatabase.getHistoryItemsForRecyclerView(0, itemsCount);
        final int typeIndex = cursor.getColumnIndex("type");
        final int idIndex = cursor.getColumnIndex("id");
        final int urlIndex = cursor.getColumnIndex("url");
        final int titleIndex = cursor.getColumnIndex("title");
        final int timeIndex = cursor.getColumnIndex("date");
        while (cursor.moveToNext()) {
            historyList.add(new HistoryModel(cursor.getInt(idIndex),
                    cursor.getString(urlIndex),
                    cursor.getString(titleIndex),
                    cursor.getString(timeIndex),
                    cursor.getInt(typeIndex)));
        }
        cursor.close();
        adapter.setHistory(historyList);
    }

    /*
    private void multiSelect(int position) {
            if (adapter.multiSelectList.contains(position)) {
                adapter.multiSelectList.remove(Integer.valueOf(position));
            } else {
                adapter.multiSelectList.add(position);
            }
            if (adapter.multiSelectList.size() > 0) {
                contextualToolBarTitle.setText(getResources().getQuantityString(R.plurals.items,
                        adapter.multiSelectList.size(), adapter.multiSelectList.size()));
            } else {
                hideContextualMenu();
            }
            adapter.notifyItemChanged(position);
    }

    private void deleteSelectedItems() {
        Collections.sort(adapter.multiSelectList);
        for (int i = adapter.multiSelectList.size() - 1; i >= 0; i--) {
            int position = adapter.multiSelectList.get(i);
            if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_HISTORY) {
                historyDatabase.deleteHistoryPoint(historyList.get(position).getId());
            } else {
                historyDatabase.deleteQuery(historyList.get(position).getId());
            }
            historyList.remove(position);
            adapter.notifyItemRemoved(position);
            //check if date view is to be removed
            if ((position == historyList.size()
                    || historyListView.getAdapter().getItemViewType(position) == HistoryAdapter.VIEW_TYPE_DATE)
                    && historyListView.getAdapter().getItemViewType(position - 1 ) == HistoryAdapter.VIEW_TYPE_DATE) {
                historyList.remove(position-1);
                adapter.notifyItemRemoved(position-1);
                if (historyList.size() == 0) {
                    noHistoryMessage.setVisibility(View.VISIBLE);
                }
            }
        }
        historyListView.scrollToPosition(historyList.size() - 1);
        hideContextualMenu();
    }

    private void showContextualMenu() {
        //if its already visible dont execute the next lines
        if (isMultiSelect) {
            return;
        }
        isMultiSelect = true;
        Objects.requireNonNull(getParentFragment()).setHasOptionsMenu(false);
        setDisplayHomeAsUpEnabled(false);
        contextualToolBar.setVisibility(View.VISIBLE);
    }
    */

    private void hideContextualMenu() {
        //if its already hidden dont execute the next lines
        if (!isMultiSelect) {
            return;
        }
        isMultiSelect = false;
        // adapter.multiSelectList.clear();
        adapter.notifyDataSetChanged();
        Objects.requireNonNull(getParentFragment()).setHasOptionsMenu(true);
        setDisplayHomeAsUpEnabled(true);
        contextualToolBar.setVisibility(View.GONE);
    }
}