package com.cliqz.browser.controlcenter;

import android.app.AlertDialog;
import android.content.Context;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.TypefaceSpan;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.nove.Bus;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private static final int FOOTER_VIEW = 1;
    private static final int REGULAR_VIEW = 2;

    private final Context mContext;
    private final List<DashboardItemEntity> mDashboardItems;
    private final Bus mBus;

    private boolean mIsDashboardEnabled = true;

    DashboardAdapter(Context context, Bus bus) {
        mContext = context;
        mDashboardItems = new ArrayList<>();
        mBus = bus;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == REGULAR_VIEW) {
            final View view = LayoutInflater.from(mContext).inflate(R.layout.dashboard_item2,
                    parent, false);
            return new TwoItemsViewHolder(view);
        } else {
            final View view = LayoutInflater.from(mContext).inflate(R.layout.bond_dashboard_footer_view,
                    parent, false);
            return new FooterViewHolder(view);
        }
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
        if (holder instanceof TwoItemsViewHolder) {
            final TwoItemsViewHolder viewHolder = (TwoItemsViewHolder) holder;
            setTwoItemsRowValues(viewHolder.leftItem, mDashboardItems.get(position * 2));
            setTwoItemsRowValues(viewHolder.rightItem, mDashboardItems.get(position * 2 + 1));
            viewHolder.leftItem.changeState(mIsDashboardEnabled);
            viewHolder.rightItem.changeState(mIsDashboardEnabled);
        } else {
            final FooterViewHolder viewHolder = (FooterViewHolder) holder;
            if (mIsDashboardEnabled) {
                viewHolder.resetButton.setOnClickListener(v -> new AlertDialog.Builder(v.getContext())
                        .setTitle(R.string.bond_dashboard_clear_dialog_title)
                        .setMessage(R.string.bond_dashboard_clear_dialog_message)
                        .setPositiveButton(R.string.button_ok, (dialogInterface, i) -> {
                            mBus.post(new Messages.ClearDashboardData());
                        })
                        .setNegativeButton(R.string.cancel, null)
                        .show());
            }
        }
    }

    @Override
    public int getItemCount() {
        //The data is shown in groups of 2 and we have a footer item in the end.
        return mDashboardItems.size() / 2 + 1;
    }

    @Override
    public int getItemViewType(int position) {
        if (position == mDashboardItems.size() / 2) {
            return FOOTER_VIEW;
        } else {
            return REGULAR_VIEW;
        }
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

    private class FooterViewHolder extends RecyclerView.ViewHolder {
        final TextView resetButton;

        FooterViewHolder(View view) {
            super(view);
            resetButton = view.findViewById(R.id.reset);
        }
    }
}