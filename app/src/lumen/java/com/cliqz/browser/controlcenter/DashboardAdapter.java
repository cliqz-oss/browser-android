package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.support.annotation.NonNull;
import android.support.v7.widget.RecyclerView;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.TypefaceSpan;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.cliqz.browser.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private final Context mContext;
    private final List<DashboardItemEntity> mDashboardItems;

    private boolean mIsDashboardEnabled = true;

    DashboardAdapter(Context context) {
        mContext = context;
        mDashboardItems = new ArrayList<>();
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        final View view = LayoutInflater.from(mContext).inflate(R.layout.dashboard_item2,
                parent, false);
        return new TwoItemsViewHolder(view);
    }

    private void setTwoItemsRowValues(ItemStructure view, DashboardItemEntity item) {
        String measurementText = item.getMeasurementValue();
        final int unitStartIdx = measurementText.length();
        if (!item.getMeasurementUnit().isEmpty()) {
            measurementText = measurementText.concat("\n").concat(item.getMeasurementUnit());
        }
        final Spannable spannable = new SpannableString(measurementText);
        spannable.setSpan(new TypefaceSpan(mContext.getString(R.string.roboto_light)), unitStartIdx, measurementText.length()
                , Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        view.itemMeasurementView.setText(spannable);
        if (item.getmViewType() == DashboardItemEntity.VIEW_TYPE_SHIELD) {
            view.itemMeasurementView.setBackgroundResource(item.getIconResId());
        } else {
            view.itemMeasurementView.setCompoundDrawablesWithIntrinsicBounds(0, item.getIconResId(), 0, 0);
        }
        view.itemTitleView.setText(item.getTitle());
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        final TwoItemsViewHolder viewHolder = (TwoItemsViewHolder) holder;
        setTwoItemsRowValues(viewHolder.leftItem, mDashboardItems.get(position * 2));
        setTwoItemsRowValues(viewHolder.rightItem, mDashboardItems.get(position * 2 + 1));
        viewHolder.leftItem.changeState(mIsDashboardEnabled);
        viewHolder.rightItem.changeState(mIsDashboardEnabled);
    }

    @Override
    public int getItemCount() {
        return mDashboardItems.size() / 2;
    }

    void addItems(List<DashboardItemEntity> items) {
        mDashboardItems.clear();
        mDashboardItems.addAll(items);
        notifyDataSetChanged();
    }

    void setIsDashboardEnabled(boolean isDashboardEnabled) {
        mIsDashboardEnabled = isDashboardEnabled;
        notifyDataSetChanged();
    }

    private enum ItemType {
        ONE_VIEW, TWO_VIEWS
    }

    private class ItemStructure {
        RelativeLayout itemLayout;
        TextView itemMeasurementView;
        TextView itemTitleView;

        void changeState(boolean isEnabled) {
            itemMeasurementView.setEnabled(isEnabled);
            itemTitleView.setEnabled(isEnabled);
        }
    }

    private class TwoItemsViewHolder extends RecyclerView.ViewHolder {
        final ItemStructure leftItem;
        final ItemStructure rightItem;

        TwoItemsViewHolder(View itemView) {
            super(itemView);
            final RelativeLayout leftView = itemView.findViewById(R.id.left_item);
            leftItem = findViews(leftView);
            leftItem.itemLayout = leftView;

            leftItem.changeState(mIsDashboardEnabled);
            final RelativeLayout rightView = itemView.findViewById(R.id.right_item);
            rightItem = findViews(rightView);
            rightItem.itemLayout = rightView;
            rightItem.changeState(mIsDashboardEnabled);
        }

        private ItemStructure findViews(View view) {
            final ItemStructure item = new ItemStructure();
            item.itemTitleView = view.findViewById(R.id.item_title);
            item.itemMeasurementView = view.findViewById(R.id.item_measurement);
            return item;
        }
    }
}