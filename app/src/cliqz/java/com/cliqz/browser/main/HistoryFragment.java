package com.cliqz.browser.main;

import android.database.Cursor;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.ItemTouchHelper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.overview.OverviewTabsEnum;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Subscribe;

import java.util.ArrayList;
import java.util.Collections;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
public class HistoryFragment extends FragmentWithBus {

    private boolean isMultiSelect;
    private HistoryAdapter adapter;
    private final ArrayList<HistoryModel> historyList = new ArrayList<>();
    private View contextualToolBar;
    private TextView contextualToolBarTitle;

    @BindView(R.id.history_rview)
    RecyclerView historyListView;

    @BindView(R.id.no_history_ll)
    LinearLayout noHistoryMessage;

    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        contextualToolBar = ((OverviewFragment)getParentFragment()).contextualToolBar;
        contextualToolBarTitle = contextualToolBar.findViewById(R.id.contextual_title);
        final View view = inflater.inflate(R.layout.fragment_history_recyclerview, container, false);
        ButterKnife.bind(this,view);
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
        if (historyList.size() == 0) {
            noHistoryMessage.setVisibility(View.VISIBLE);
            return;
        }
        noHistoryMessage.setVisibility(View.GONE);
        if (adapter == null) {
            adapter = new HistoryAdapter(historyList, engine, handler, new HistoryAdapter.ClickListener() {
                @Override
                public void onClick(View view, int position) {
                    //ignore click on date
                    if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_DATE) {
                        return;
                    }
                    if (isMultiSelect) {
                        multiSelect(position);
                    } else if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_HISTORY) {
                        bus.post(CliqzMessages.OpenLink.openFromHistory(historyList.get(position).getUrl()));
                    } else if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_QUERY) {
                        bus.post(new Messages.OpenQuery(historyList.get(position).getUrl()));
                    }
                }

                @Override
                public void onLongPress(View view, int position) {
                    //if view is being swiped ignore long press
                    if (view.getTranslationX() != 0) {
                        return;
                    }
                    //ignore long press on date
                    if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_DATE) {
                        return;
                    }
                    if (!isMultiSelect) {
                        adapter.multiSelectList.clear();
                        showContextualMenu();
                    }
                    multiSelect(position);
                }
            });
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
        if (((OverviewFragment)getParentFragment()).getCurrentPageIndex()
                == OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            hideContextualMenu();
        }
    }

    @Subscribe
    public void onContextualBarDelete(Messages.OnContextualBarDeletePressed event) {
        if (((OverviewFragment)getParentFragment()).getCurrentPageIndex()
                == OverviewTabsEnum.HISTORY.getFragmentIndex()) {
            deleteSelectedItems();
        }
    }

    private void prepareRecyclerView() {
        final View view = getView();
        if (view == null) {
            return;
        }
        historyListView.setLayoutManager(new LinearLayoutManager(getContext()));

        //callback to handle swipe and delete
        final ItemTouchHelper.SimpleCallback simpleItemTouchCallback =
                new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {

                    @Override
                    public int getSwipeDirs(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder) {
                        //Dont swipe date view and when contextual menu is enabled
                        if (viewHolder instanceof HistoryAdapter.DateViewHolder || isMultiSelect) {
                            return 0;
                        }
                        return super.getSwipeDirs(recyclerView, viewHolder);
                    }

                    @Override
                    public boolean onMove(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder,
                                          RecyclerView.ViewHolder target) {
                        return false;
                    }

                    @Override
                    public void onSwiped(RecyclerView.ViewHolder viewHolder, int direction) {
                        final int position = viewHolder.getAdapterPosition();
                        final int type = viewHolder.getItemViewType();
                        if (type == HistoryAdapter.VIEW_TYPE_HISTORY) {
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
                };

        //callbacks for click and long click on items
        final ItemTouchHelper itemTouchHelper = new ItemTouchHelper(simpleItemTouchCallback);
        itemTouchHelper.attachToRecyclerView(historyListView);
        historyListView.setAdapter(adapter);
        historyListView.scrollToPosition(historyList.size()-1);
    }

    private void prepareListData() {
        //TODO historyDatabase.getHistoryItemsCount has to be modified to get the limit correctly;
        historyList.clear();
        final Cursor cursor = historyDatabase.getHistoryItemsForRecyclerView(0, historyDatabase.getHistoryItemsCount());
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
    }

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
        getParentFragment().setHasOptionsMenu(false);
        setDisplayHomeAsUpEnabled(false);
        contextualToolBar.setVisibility(View.VISIBLE);
    }

    private void hideContextualMenu() {
        //if its already hidden dont execute the next lines
        if (!isMultiSelect) {
            return;
        }
        isMultiSelect = false;
        adapter.multiSelectList.clear();
        adapter.notifyDataSetChanged();
        getParentFragment().setHasOptionsMenu(true);
        setDisplayHomeAsUpEnabled(true);
        contextualToolBar.setVisibility(View.GONE);
    }
}