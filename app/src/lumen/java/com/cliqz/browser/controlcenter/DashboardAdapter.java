package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.graphics.Typeface;
import android.support.annotation.NonNull;
import android.support.v7.widget.RecyclerView;
import android.text.Spannable;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.AbsoluteSizeSpan;
import android.text.style.TypefaceSpan;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

import com.cliqz.browser.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    private final int MIN_MONEY_BAR_VALUE = 5;

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
        if (viewType == ItemType.ONE_VIEW.ordinal()) {
            final View view = LayoutInflater.from(mContext).inflate(R.layout.dashboard_item1,
                    parent, false);
            return new ItemViewHolder(view);
        } else {
            final View view = LayoutInflater.from(mContext).inflate(R.layout.dashboard_item2,
                    parent, false);
            return new TwoItemsViewHolder(view);
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
        view.itemMeasurementView.setBackgroundResource(item.getIconResId());
        view.itemTitleView.setText(item.getTitle());
        view.itemContentView.setText(item.getContent());
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        if (holder.getItemViewType() == ItemType.TWO_VIEWS.ordinal()) {
            final TwoItemsViewHolder viewHolder = (TwoItemsViewHolder) holder;
            setTwoItemsRowValues(viewHolder.leftItem, mDashboardItems.get(position));
            setTwoItemsRowValues(viewHolder.rightItem, mDashboardItems.get(position + 1));
            viewHolder.leftItem.changeState(mIsDashboardEnabled);
            viewHolder.rightItem.changeState(mIsDashboardEnabled);
        } else {
            final ItemViewHolder itemViewHolder = (ItemViewHolder) holder;
            // +1 because first 2 items is combined in 1 item
            final DashboardItemEntity curItem = mDashboardItems.get(position + 1);

            if (curItem.getIconResId() != -1) {
                itemViewHolder.itemIconView.setVisibility(View.VISIBLE);
                itemViewHolder.itemIconView.setImageResource(curItem.getIconResId());
            } else {
                itemViewHolder.itemIconView.setVisibility(View.GONE);
            }

            if (curItem.getMeasurementValue().isEmpty()) { // no measurement value
                itemViewHolder.itemMeasurementValueView.setVisibility(View.GONE);
                itemViewHolder.itemMeasurementUnitView.setVisibility(View.GONE);
            } else {
                itemViewHolder.itemMeasurementValueView.setVisibility(View.VISIBLE);
                itemViewHolder.itemMeasurementUnitView.setVisibility(View.VISIBLE);
                final Spannable spannableValue = new SpannableString(curItem.getMeasurementValue());
                final Spannable spannableUnit = new SpannableString(curItem.getMeasurementUnit());
                if (curItem.getIconResId() != -1) { //measurement value exist with  icon
                    final int valueTextSize = (int) mContext.getResources()
                            .getDimension(R.dimen.dashboard_measurement_value_size);
                    final int unitTextSize = (int) mContext.getResources()
                            .getDimension(R.dimen.dashboard_measurement_unit_size);

                    spannableValue.setSpan(new AbsoluteSizeSpan(valueTextSize), 0,
                            curItem.getMeasurementValue().length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    spannableUnit.setSpan(new AbsoluteSizeSpan(unitTextSize), 0,
                            curItem.getMeasurementUnit().length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

                    itemViewHolder.itemMeasurementUnitView.setTypeface(Typeface.SANS_SERIF);
                    itemViewHolder.itemMeasurementValueView.setTypeface(Typeface.SANS_SERIF);
                } else { //measurement value exist with no icon
                    final int valueTextSize = (int) mContext.getResources()
                            .getDimension(R.dimen.dashboard_measurement_value_size_large);

                    spannableValue.setSpan(new TypefaceSpan(mContext.getString(R.string.roboto_light)),
                            0, curItem.getMeasurementValue().length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
                    spannableUnit.setSpan(new TypefaceSpan(mContext.getString(R.string.roboto_medium)),
                            0, curItem.getMeasurementUnit().length(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);

                    itemViewHolder.itemMeasurementValueView.setTextSize(TypedValue.COMPLEX_UNIT_PX, valueTextSize);
                    itemViewHolder.itemMeasurementUnitView.setTextSize(TypedValue.COMPLEX_UNIT_PX, valueTextSize);
                }
                itemViewHolder.itemMeasurementValueView.setText(spannableValue);
                itemViewHolder.itemMeasurementUnitView.setText(spannableUnit);
            }
            itemViewHolder.itemTitleView.setText(curItem.getTitle());
            itemViewHolder.itemContentView.setText(curItem.getContent());

            if (curItem.getOptionValue() == -1) {
                itemViewHolder.itemMoneyBarView.setVisibility(View.GONE);
                itemViewHolder.itemMoneyBarValueView.setVisibility(View.GONE);
            } else {
                itemViewHolder.itemMoneyBarView.setVisibility(View.VISIBLE);
                final int curMoneyValue = curItem.getOptionValue() + MIN_MONEY_BAR_VALUE;
                itemViewHolder.itemMoneyBarView.setProgress(curMoneyValue);
                itemViewHolder.itemMoneyBarValueView.setText(String.valueOf(curItem.getOptionValue() +
                        MIN_MONEY_BAR_VALUE).concat("€"));

                itemViewHolder.itemMoneyBarView.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
                    @Override
                    public void onProgressChanged(SeekBar seekBar, int progress, boolean fromUser) {
                        itemViewHolder.itemMoneyBarValueView.setText(String.valueOf(progress +
                                MIN_MONEY_BAR_VALUE).concat(" €"));
                    }

                    @Override
                    public void onStartTrackingTouch(SeekBar seekBar) {

                    }

                    @Override
                    public void onStopTrackingTouch(SeekBar seekBar) {

                    }
                });

                itemViewHolder.itemMoneyBarValueView.setVisibility(View.VISIBLE);
            }
            itemViewHolder.changeState(mIsDashboardEnabled);
        }
    }

    @Override
    public int getItemViewType(int position) {
        return position == 0 ? ItemType.TWO_VIEWS.ordinal() : ItemType.ONE_VIEW.ordinal();
    }

    @Override
    public int getItemCount() { // -1, because first 2 items combined in the first view
        return mDashboardItems.size() - 1;
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

    private class ItemViewHolder extends RecyclerView.ViewHolder {
        final LinearLayout itemLayout;
        final ImageView itemIconView;
        final TextView itemMeasurementValueView;
        final TextView itemMeasurementUnitView;
        final TextView itemTitleView;
        final TextView itemContentView;
        final SeekBar itemMoneyBarView;
        final TextView itemMoneyBarValueView;

        ItemViewHolder(View itemView) {
            super(itemView);
            itemLayout = itemView.findViewById(R.id.dashboard_item_layout);
            itemIconView = itemView.findViewById(R.id.item_icon);
            itemMeasurementValueView = itemView.findViewById(R.id
                    .item_measurement_value);
            itemMeasurementUnitView = itemView.findViewById(R.id
                    .item_measurement_unit);
            itemTitleView = itemView.findViewById(R.id.item_title);
            itemContentView = itemView.findViewById(R.id.item_content);
            itemMoneyBarView = itemView.findViewById(R.id.item_money_bar);
            itemMoneyBarValueView = itemView.findViewById(R.id.item_money_bar_value);
            changeState(mIsDashboardEnabled);
        }

        void changeState(boolean isEnabled) {
            itemIconView.setEnabled(isEnabled);
            itemMeasurementValueView.setEnabled(isEnabled);
            itemMeasurementUnitView.setEnabled(isEnabled);
            itemTitleView.setEnabled(isEnabled);
            itemContentView.setEnabled(isEnabled);
            itemMoneyBarValueView.setEnabled(isEnabled);
        }
    }

    private class ItemStructure {
        LinearLayout itemLayout;
        TextView itemMeasurementView;
        TextView itemTitleView;
        TextView itemContentView;

        void changeState(boolean isEnabled) {
            itemMeasurementView.setEnabled(isEnabled);
            itemTitleView.setEnabled(isEnabled);
            itemContentView.setEnabled(isEnabled);
        }
    }

    private class TwoItemsViewHolder extends RecyclerView.ViewHolder {
        final ItemStructure leftItem;
        final ItemStructure rightItem;

        TwoItemsViewHolder(View itemView) {
            super(itemView);
            final LinearLayout leftView = itemView.findViewById(R.id.left_item);
            leftItem = findViews(leftView);
            leftItem.itemLayout = leftView;

            leftItem.changeState(mIsDashboardEnabled);
            final LinearLayout rightView = itemView.findViewById(R.id.right_item);
            rightItem = findViews(rightView);
            rightItem.itemLayout = rightView;
            rightItem.changeState(mIsDashboardEnabled);
        }

        private ItemStructure findViews(View view) {
            final ItemStructure item = new ItemStructure();
            item.itemTitleView = view.findViewById(R.id.item_title);
            item.itemContentView = view.findViewById(R.id.item_content);
            item.itemMeasurementView = view.findViewById(R.id.item_measurement);
            return item;
        }
    }
}