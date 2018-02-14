package com.cliqz.deckview;

import android.content.res.Configuration;
import android.graphics.Canvas;
import android.support.v4.view.ViewCompat;
import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.helper.ItemTouchHelper;

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
    public int getSwipeDirs(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder) {
        return (mTabsDeckView.getResources().getConfiguration().orientation ==
                Configuration.ORIENTATION_PORTRAIT)
                ? ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT
                : ItemTouchHelper.UP | ItemTouchHelper.DOWN;
    }

    @Override
    public boolean onMove(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder,
                          RecyclerView.ViewHolder target) {
        return false;
    }

    @Override
    public void onSwiped(RecyclerView.ViewHolder viewHolder, int direction) {
        final int position = viewHolder.getLayoutPosition();
        mTabsDeckView.closeTab(position);
    }

    @Override
    public void onChildDraw(Canvas c, RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder,
                            float dX, float dY, int actionState, boolean isCurrentlyActive) {
        if (isCurrentlyActive) {
            Object originalElevation = viewHolder.itemView
                    .getTag(android.support.v7.recyclerview.R.id.item_touch_helper_previous_elevation);
            if (originalElevation == null) {
                originalElevation = ViewCompat.getElevation(viewHolder.itemView);
                ViewCompat.setElevation(viewHolder.itemView, 0);
                viewHolder.itemView.setTag(
                        android.support.v7.recyclerview.R.id.item_touch_helper_previous_elevation,
                        originalElevation);
            }
        }
        viewHolder.itemView.setTranslationX(dX);
        viewHolder.itemView.setTranslationY(dY);
    }
}