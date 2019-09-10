package com.cliqz.browser.starttab;

import android.content.Context;
import android.database.Cursor;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.HistoryAdapter;
import com.cliqz.browser.main.HistoryModel;
import com.cliqz.browser.main.MainThreadHandler;
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
public class HistoryView extends FrameLayout implements Updatable {

    private final HistoryAdapter adapter;

    @BindView(R.id.history_rview)
    RecyclerView historyListView;

    @Inject
    Engine engine;

    @Inject
    MainThreadHandler handler;

    @Inject
    Bus bus;

    @Inject
    HistoryDatabase historyDatabase;

    public HistoryView(@NonNull Context context) {
        super(context);
        final View view = LayoutInflater.from(context).inflate(R.layout.fragment_history, this);
        ButterKnife.bind(this, view);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        adapter = new HistoryAdapter(engine, handler, bus);
        historyListView.setLayoutManager(new LinearLayoutManager(getContext()));
        //callbacks for click and long click on items
        final ItemTouchHelper itemTouchHelper =
                new ItemTouchHelper(new HistoryItemTouchHelper(historyDatabase, adapter));
        itemTouchHelper.attachToRecyclerView(historyListView);
        historyListView.scrollToPosition(0);
        historyListView.setAdapter(adapter);
        prepareListData();
    }

    private void prepareListData() {
        //TODO historyDatabase.getHistoryItemsCount has to be modified to get the limit correctly;
        final Cursor cursor = historyDatabase.getHistoryItemsForRecyclerView(0, historyDatabase.getHistoryItemsCount());
        final int typeIndex = cursor.getColumnIndex("type");
        final int idIndex = cursor.getColumnIndex("id");
        final int urlIndex = cursor.getColumnIndex("url");
        final int titleIndex = cursor.getColumnIndex("title");
        final int timeIndex = cursor.getColumnIndex("date");
        final ArrayList<HistoryModel> history = new ArrayList<>(cursor.getCount());
        while (cursor.moveToNext()) {
            if (cursor.getInt(typeIndex) != HistoryAdapter.VIEW_TYPE_QUERY) {
                history.add(new HistoryModel(cursor.getInt(idIndex),
                        cursor.getString(urlIndex),
                        cursor.getString(titleIndex),
                        cursor.getString(timeIndex),
                        cursor.getInt(typeIndex)));
            }
        }
        cursor.close();
        adapter.setHistory(history);
    }

    @Override
    public void update() {
        prepareListData();
        historyListView.scrollToPosition(0);
    }
}