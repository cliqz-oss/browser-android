package com.cliqz.browser.controlcenter;

import android.app.AlertDialog;
import android.content.Context;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import com.cliqz.browser.R;

import java.util.ArrayList;
import java.util.List;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardFragment extends ControlCenterFragment {

    private TextView mDashboardStateTextView;
    private View mDisableDashboardView;
    private DashboardAdapter mDashboardAdapter;
    private boolean mIsDailyView;
    private final int[] tabsTitleIds = {
            R.string.bond_dashboard_today_title, R.string.bond_dashboard_week_title };
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        if (arguments != null) {
            mIsDailyView = arguments.getBoolean(ControlCenterPagerAdapter.IS_TODAY);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.bond_dashboard_fragment, container,
                false);
        RecyclerView dashBoardListView = (RecyclerView) view.findViewById(R.id.dash_board_list_view);
        mDashboardStateTextView = (TextView) view.findViewById(R.id.dashboard_state_text);
        mDisableDashboardView = view.findViewById(R.id.dashboard_disable_view);
        mDashboardAdapter = new DashboardAdapter(getContext());
        TextView resetButton = view.findViewById(R.id.reset);
        resetButton.setOnClickListener(v -> new AlertDialog.Builder(v.getContext())
                .setTitle(R.string.bond_dashboard_clear_dialog_title)
                .setMessage(R.string.bond_dashboard_clear_dialog_message)
                .setPositiveButton(R.string.button_ok, (dialogInterface, i) -> {
                    updateUI(new GeckoBundle());
                    //mControlCenterPagerAdapter.setTrackingData(new GeckoBundle());
                    //EventDispatcher.getInstance().dispatch("Privacy:ClearInsightsData", null);
                })
                .setNegativeButton(R.string.cancel, null)
                .show());
        updateUI(new GeckoBundle());
        dashBoardListView.setAdapter(mDashboardAdapter);
        dashBoardListView.setLayoutManager(new LinearLayoutManager(getContext()));
        changeDashboardState(true); // @TODO should change with real state
        return view;
    }

    public void changeDashboardState(boolean isEnabled) {
        final int stateTextId;
        final int overlayVisibility;
        final int stateTextColorId;
        if (isEnabled) {
            stateTextId = R.string.bond_dashboard_contols_on;
            overlayVisibility = View.GONE;
            stateTextColorId = R.color.bond_general_color_blue;
        } else {
            stateTextId = R.string.bond_dashboard_contols_off;
            overlayVisibility = View.VISIBLE;
            stateTextColorId = R.color.bond_disabled_state_color;
        }
        mDashboardAdapter.setIsDashboardEnabled(isEnabled);

        mDisableDashboardView.setVisibility(overlayVisibility);
        final StringBuilder stateText = new StringBuilder();
        stateText.append(getString(R.string.bond_dashboard_ultimate_protection));
        stateText.append(" ");
        stateText.append(getString(stateTextId));

        mDashboardStateTextView.setTextColor(ContextCompat.getColorStateList(getContext(),
                stateTextColorId));
        mDashboardStateTextView.setText(stateText);
    }

    @Override
    public String getTitle(Context context, int pos) {
        return context.getString(tabsTitleIds[pos]);
    }

    @Override
    public void updateUI(GeckoBundle data) {
        if (mDashboardAdapter == null) {
            return;
        }
        if (mIsDailyView) {
            updateViews(GeckoBundleUtils.safeGetBundle(data, "data/day"));
        } else {
            updateViews(GeckoBundleUtils.safeGetBundle(data, "data/week"));
        }
    }

    @Override
    public void refreshUI() {
        if (getView() == null) {
            return; //return if view is not inflated yet
        }
        mDashboardAdapter.notifyDataSetChanged();
    }

    @Override
    public void refreshUIComponent(boolean optionValue) {
            changeDashboardState(optionValue);
    }

    public void updateViews(GeckoBundle data) {
        if (data == null) {
            return;
        }
        final MeasurementWrapper timeSaved = ValuesFormatterUtil.formatTime(data.getInt("timeSaved", 0));
        final MeasurementWrapper dataSaved = ValuesFormatterUtil.formatBytesCount(data.getInt("dataSaved", 0));
        final MeasurementWrapper adsBlocked = ValuesFormatterUtil.formatBlockCount(data.getInt("adsBlocked", 0));
        final MeasurementWrapper trackersDetected = ValuesFormatterUtil.formatBlockCount(data.getInt("trackersDetected", 0));
        final List<DashboardItemEntity> dashboardItems = new ArrayList<>();
        dashboardItems.add(new DashboardItemEntity(timeSaved.getValue(),
                timeSaved.getUnit() == 0 ? "" : getString(timeSaved.getUnit()),
                R.drawable.ic_time_circle, getString(R.string.bond_dashboard_time_saved_title),
                getString(R.string.bond_dashboard_time_saved_description), -1));
        dashboardItems.add(new DashboardItemEntity(adsBlocked.getValue(),
                adsBlocked.getUnit() == 0 ? "" : getString(adsBlocked.getUnit()),
                R.drawable.ic_ad_blocking_shiel, getString(R.string.bond_dashboard_ads_blocked_title),
                getString(R.string.bond_dashboard_ads_blocked_description), -1));
        dashboardItems.add(new DashboardItemEntity(dataSaved.getValue(),
                dataSaved.getUnit() == 0 ? "" : getString(dataSaved.getUnit()), -1,
                getString(R.string.bond_dashboard_data_saved_title),
                getString(R.string.bond_dashboard_data_saved_description), -1));
        dashboardItems.add(new DashboardItemEntity("", "", R.drawable.ic_anti_phishing_hook,
                getString(R.string.bond_dashboard_phishing_protection_title),
                getString(R.string.bond_dashboard_phishing_protection_description), -1));
        dashboardItems.add(new DashboardItemEntity(trackersDetected.getValue(),
                getString(R.string.bond_dashboard_tracking_companies_unit),
                R.drawable.ic_eye, getString(R.string.bond_dashboard_tracking_companies_title),
                getString(R.string.bond_dashboard_tracking_companies_description), -1));

        /* @TODO decide how to calculate battery saved then unhide
        dashboardItems.add(new DashboardItemEntity("255", "MIN", R.drawable.ic_battery,
                getString(R.string.bond_dashboard_battery_saved_title),getString(R.string
                .bond_dashboard_battery_saved_description), -1));
        @todo unhide the money item
        dashboardItems.add(new DashboardItemEntity("261","EUR",-1,"Money saved",
                "...how much is your time worth per h", AVERAGE_MONEY_BAR_VALUE));*/
        mDashboardAdapter.addItems(dashboardItems);
    }
}