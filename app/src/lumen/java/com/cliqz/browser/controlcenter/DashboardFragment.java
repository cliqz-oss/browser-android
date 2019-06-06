package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.jsengine.Insights;
import com.cliqz.jsengine.ReadableMapUtils;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.ReadableMap;

import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import static com.cliqz.browser.controlcenter.DashboardItemEntity.VIEW_TYPE_ICON;
import static com.cliqz.browser.controlcenter.DashboardItemEntity.VIEW_TYPE_SHIELD;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardFragment extends ControlCenterFragment {

    private View mDisableDashboardView;
    private DashboardAdapter mDashboardAdapter;
    private boolean mIsDailyView;
    private final int[] tabsTitleIds = {
            R.string.bond_dashboard_today_title, R.string.bond_dashboard_week_title};

    @Inject
    Insights insights;

    @Inject
    Bus bus;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        if (arguments != null) {
            mIsDailyView = arguments.getBoolean(ControlCenterPagerAdapter.IS_TODAY);
        }
        final FlavoredActivityComponent component = getActivity() != null ?
                BrowserApp.getActivityComponent(getActivity()) : null;
        if (component != null) {
            component.inject(this);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.bond_dashboard_fragment, container,
                false);
        final RecyclerView dashBoardListView = view.findViewById(R.id.dash_board_list_view);
        mDisableDashboardView = view.findViewById(R.id.dashboard_disable_view);
        mDashboardAdapter = new DashboardAdapter(getContext(), bus);
        updateUI();
        dashBoardListView.setAdapter(mDashboardAdapter);
        dashBoardListView.setLayoutManager(new LinearLayoutManager(getContext()));
        changeDashboardState(true); // @TODO should change with real state
        return view;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        updateUI();
    }

    public void changeDashboardState(boolean isEnabled) {
        final int overlayVisibility;
        if (isEnabled) {
            overlayVisibility = View.GONE;
        } else {
            overlayVisibility = View.VISIBLE;
        }
        mDashboardAdapter.setIsDashboardEnabled(isEnabled);

        mDisableDashboardView.setVisibility(overlayVisibility);
    }

    @Override
    public String getTitle(Context context, int pos) {
        return context.getString(tabsTitleIds[pos]);
    }

    @Override
    public void updateUI() {
        if (mDashboardAdapter == null || getView() == null) {
            return;
        }
        if (mIsDailyView) {
            insights.getInsightsData((data) -> getView().post(() -> updateViews(data.getMap("result"))), "day");
        } else {
            insights.getInsightsData((data) -> getView().post(() -> updateViews(data.getMap("result"))), "week");
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

    public void updateViews(ReadableMap data) {
        if (data == null) {
            return;
        }
        final MeasurementWrapper dataSaved = ValuesFormatterUtil.formatBytesCount(ReadableMapUtils.getSafeInt(data, "dataSaved"));
        final MeasurementWrapper adsBlocked = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data,"adsBlocked"));
        final MeasurementWrapper trackersDetected = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data, "trackersDetected"));
        final MeasurementWrapper pagesVisited = ValuesFormatterUtil.formatBlockCount(ReadableMapUtils.getSafeInt(data,"pages"));
        final List<DashboardItemEntity> dashboardItems = new ArrayList<>();

        dashboardItems.add(new DashboardItemEntity(adsBlocked.getValue(),
                adsBlocked.getUnit() == 0 ? "" : getString(adsBlocked.getUnit()),
                R.drawable.ic_ad_blocking_shiel, getString(R.string.bond_dashboard_ads_blocked_title), -1, VIEW_TYPE_SHIELD));
        dashboardItems.add(new DashboardItemEntity(trackersDetected.getValue(), "",
                R.drawable.ic_eye, getString(R.string.bond_dashboard_tracking_companies_title), -1, VIEW_TYPE_ICON));
        dashboardItems.add(new DashboardItemEntity(dataSaved.getValue(),
                dataSaved.getUnit() == 0 ? "" : getString(dataSaved.getUnit()), R.drawable.ic_ad_blocking_shiel,
                getString(R.string.bond_dashboard_data_saved_title), -1, VIEW_TYPE_SHIELD));
        dashboardItems.add(new DashboardItemEntity(pagesVisited.getValue(), "", R.drawable.ic_anti_phishing_hook,
                getString(R.string.bond_dashboard_phishing_protection_title), -1, VIEW_TYPE_ICON));
        mDashboardAdapter.addItems(dashboardItems);
    }
}