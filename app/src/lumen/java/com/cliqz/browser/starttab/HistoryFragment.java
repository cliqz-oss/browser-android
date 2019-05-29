package com.cliqz.browser.starttab;

import android.database.Cursor;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.HistoryAdapter;
import com.cliqz.browser.main.HistoryModel;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
public class HistoryFragment extends StartTabFragment {

    private final ArrayList<HistoryModel> historyList = new ArrayList<>();
    private HistoryAdapter adapter;

    @BindView(R.id.history_rview)
    RecyclerView historyListView;

    @BindView(R.id.no_history_ll)
    LinearLayout noHistoryMessage;

    @Inject
    Engine engine;

    @Inject
    MainActivityHandler handler;

    @Inject
    Bus bus;

    @Inject
    HistoryDatabase historyDatabase;

    @Override
    public void onStart() {
        super.onStart();
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
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
                    if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_HISTORY) {
                        bus.post(CliqzMessages.OpenLink.openFromHistory(historyList.get(position).getUrl()));
                    } else if (adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_QUERY) {
                        bus.post(new Messages.OpenQuery(historyList.get(position).getUrl()));
                    }
                }

                @Override
                public void onLongPress(View view, int position) {

                }
            });
        }
        prepareRecyclerView();
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.fragment_history_recyclerview, container, false);
        ButterKnife.bind(this, view);
        return view;
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
                        if (viewHolder instanceof HistoryAdapter.DateViewHolder) {
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
            if (cursor.getInt(typeIndex) != HistoryAdapter.VIEW_TYPE_QUERY) {
                historyList.add(new HistoryModel(cursor.getInt(idIndex),
                        cursor.getString(urlIndex),
                        cursor.getString(titleIndex),
                        cursor.getString(timeIndex),
                        cursor.getInt(typeIndex)));
            }
        }
        cursor.close();
    }

    @Override
    public String getTitle() {
        return "";
    }

    @Override
    public int getIconId() {
        return R.drawable.ic_history_white;
    }
}