package com.cliqz.browser.starttab;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.main.HistoryAdapter;

import org.jetbrains.annotations.NotNull;

import acr.browser.lightning.database.HistoryDatabase;

public class HistoryItemTouchHelper extends ItemTouchHelper.SimpleCallback {

    private final HistoryDatabase db;
    private final HistoryAdapter adapter;

    @SuppressWarnings("WeakerAccess")
    public HistoryItemTouchHelper(HistoryDatabase db, HistoryAdapter adapter) {
        super(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT);
        this.db = db;
        this.adapter = adapter;
    }

    @Override
    public int getSwipeDirs(@NonNull RecyclerView recyclerView,
                            @NonNull RecyclerView.ViewHolder viewHolder) {
        //Dont swipe date view and when contextual menu is enabled
        if (viewHolder instanceof HistoryAdapter.DateViewHolder) {
            return 0;
        }
        return super.getSwipeDirs(recyclerView, viewHolder);
    }

    @Override
    public boolean onMove(@NonNull RecyclerView recyclerView,
                          @NonNull RecyclerView.ViewHolder viewHolder,
                          @NonNull RecyclerView.ViewHolder target) {
        return false;
    }

    @Override
    public void onSwiped(@NotNull RecyclerView.ViewHolder viewHolder, int direction) {
        final int position = viewHolder.getAdapterPosition();
        final int type = viewHolder.getItemViewType();
        if (type == HistoryAdapter.VIEW_TYPE_HISTORY) {
            db.deleteHistoryPoint(adapter.getHistoryId(position));
            // historyDatabase.deleteHistoryPoint(historyList.get(position).getId());
        } else {
            db.deleteQuery(adapter.getQueryId(position));
            // historyDatabase.deleteQuery(historyList.get(position).getId());
        }
        adapter.remove(position);
        // adapter.notifyItemRemoved(position);
        //check if date view is to be removed. It should be removed if it's the last item in the list
        //or if the next item in the list is also a date view
        if ((adapter.getItemCount() == position || adapter.getItemViewType(position) == HistoryAdapter.VIEW_TYPE_DATE)
                && adapter.getItemViewType(position - 1 ) == HistoryAdapter.VIEW_TYPE_DATE) {
            adapter.remove(position-1);
            // adapter.notifyItemRemoved(position-1);
        }
    }
}
