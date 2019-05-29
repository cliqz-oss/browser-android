package com.cliqz.deckview;

import android.content.res.Configuration;
import android.graphics.Canvas;

import androidx.annotation.NonNull;
import androidx.core.view.ViewCompat;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.ItemTouchHelper;

/**
 * @author Ravjit Uppal
 */
public class SwipeToDeleteCallback extends ItemTouchHelper.SimpleCallback {

    private TabsDeckView mTabsDeckView;

    SwipeToDeleteCallback(TabsDeckView tabsDeckView) {
        super(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT);
        this.mTabsDeckView = tabsDeckView;
    }

    @Override
    public int getSwipeDirs(@NonNull RecyclerView recyclerView, @NonNull RecyclerView.ViewHolder viewHolder) {
        return (mTabsDeckView.getResources().getConfiguration().orientation ==
                Configuration.ORIENTATION_PORTRAIT)
                ? ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT
                : ItemTouchHelper.UP | ItemTouchHelper.DOWN;
    }

    @Override
    public boolean onMove(@NonNull RecyclerView recyclerView,
                          @NonNull RecyclerView.ViewHolder viewHolder,
                          @NonNull RecyclerView.ViewHolder target) {
        return false;
    }

    @Override
    public void onSwiped(@NonNull RecyclerView.ViewHolder viewHolder, int direction) {
        final int position = viewHolder.getLayoutPosition();
        mTabsDeckView.closeTab(position);
    }

    @Override
    public void onChildDraw(@NonNull Canvas canvas,
                            @NonNull RecyclerView recyclerView,
                            @NonNull RecyclerView.ViewHolder viewHolder,
                            float dX, float dY, int actionState, boolean isCurrentlyActive) {
        if (isCurrentlyActive) {
            Object originalElevation = viewHolder.itemView
                    .getTag(androidx.recyclerview.R.id.item_touch_helper_previous_elevation);
            if (originalElevation == null) {
                originalElevation = ViewCompat.getElevation(viewHolder.itemView);
                ViewCompat.setElevation(viewHolder.itemView, 0);
                viewHolder.itemView.setTag(
                        androidx.recyclerview.R.id.item_touch_helper_previous_elevation,
                        originalElevation);
            }
        }
        viewHolder.itemView.setTranslationX(dX);
        viewHolder.itemView.setTranslationY(dY);
    }
}