package com.cliqz.browser.main;

import android.app.Activity;
import android.content.res.Configuration;
import android.graphics.PorterDuff;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.PopupWindow;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import java.util.ArrayList;
import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * Created by Ravjit on 07/09/16.
 */
public class AntiTrackingDialog extends PopupWindow {

    public static final String TAG = AntiTrackingDialog.class.getSimpleName();

    private static final String antiTrackingHelpUrlDe = "https://cliqz.com/whycliqz/anti-tracking";
    private static final String antiTrackingHelpUrlEn = "https://cliqz.com/en/whycliqz/anti-tracking";

    private final boolean isIncognito;
    private final FrameLayout rootView;

    final Activity activity;
    final TrackersListAdapter adapter;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    @Bind(R.id.counter)
    TextView counter;

    @Bind(R.id.trackers_list)
    RecyclerView trackersList;
    
    @Bind(R.id.help)
    Button helpButton;
    
    @Bind(R.id.companies_header)
    TextView companiesHeader;

    @Bind(R.id.counter_header)
    TextView counterHeader;

    @Bind(R.id.upperLine)
    View upperLine;

    @Bind(R.id.lowerLine)
    View lowerLine;

    @Bind(R.id.anti_tracking_table)
    View antitrackingTable;

    public AntiTrackingDialog(Activity activity, boolean isIncognito) {
        super(WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT);
        BrowserApp.getActivityComponent(activity).inject(this);
        this.activity = activity;
        this.isIncognito = isIncognito;
        this.adapter = new TrackersListAdapter(isIncognito, this);
        rootView = new FrameLayout(activity);
        setContentView(rootView);
        setBackgroundDrawable(new ColorDrawable());
        setOutsideTouchable(true);
        setFocusable(true);
        // Detect orientation
        setupPopup(activity.getResources().getConfiguration());
    }

    private void setupPopup(Configuration config) {
        final CharSequence count = counter != null ? counter.getText() : "0";
        final @LayoutRes int layout;
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.anti_tracking_dialog_land;
                } else {
                    layout = R.layout.anti_tracking_dialog;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.anti_tracking_dialog_land;
                break;
            default:
                layout = R.layout.anti_tracking_dialog;
                break;
        }
        final View popupView = activity.getLayoutInflater().inflate(layout, null);
        ButterKnife.bind(this, popupView);
        final int popupBgColor = isIncognito ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
        final int popupTextColor = isIncognito ? R.color.normal_tab_primary_color : R.color.incognito_tab_primary_color;
        popupView.setBackgroundColor(ContextCompat.getColor(activity, popupBgColor));
        popupView.setAlpha(0.95f);

        rootView.removeAllViews();
        rootView.addView(popupView);
        companiesHeader.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        counterHeader.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        counter.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        helpButton.setTextColor(ContextCompat.getColor(activity, popupBgColor));
        helpButton.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
        upperLine.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
        lowerLine.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
//        counter.setText(Integer.toString(trackerCount));
        counter.setText(count);
        trackersList.setLayoutManager(new LinearLayoutManager(activity));
//        trackersListAdapter = new TrackersListAdapter(mDetails, isIncognito, this);
        trackersList.setAdapter(adapter);
    }

    private int countTrackerPoints(ArrayList<TrackerDetailsModel> mDetails) {
        int trackerPoints = 0;
        for (TrackerDetailsModel model: mDetails) {
            trackerPoints += model.trackerCount;
        }
        return trackerPoints;
    }

    private void setTableVisibility(ArrayList<TrackerDetailsModel> details) {
        if (details != null && antitrackingTable != null) {
            final int visibility = details.size() > 0 ?
                    View.VISIBLE : View.GONE;
            antitrackingTable.setVisibility(visibility);
        }
    }

    @Override
    public void showAsDropDown(View anchor) {
        super.showAsDropDown(anchor);
        bus.register(this);
    }

    @Override
    public void dismiss() {
        super.dismiss();
        bus.unregister(this);
    }

    @OnClick(R.id.help)
    void onHelpClicked(View v) {
        telemetry.sendAntiTrackingHelpSignal();
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                antiTrackingHelpUrlDe : antiTrackingHelpUrlEn;
        ((MainActivity)activity).tabsManager.buildTab().setUrl(helpUrl).show();
        dismiss();
    }

    public void show(View anchor) {
        showAsDropDown(anchor);
    }

    /**
     * Update the interface as we get more data
     * @param totalCounter the total number of blocked requests (with ad-blocked too)
     * @param details The detailed list of the trackers
     */
    void updateList(int totalCounter, ArrayList<TrackerDetailsModel> details) {
        counter.setText(String.format(Locale.getDefault(), "%d", totalCounter));
        final int trackerPoints = countTrackerPoints(details);
        final int othersCount = totalCounter - trackerPoints;
        if (othersCount > 0) {
            final TrackerDetailsModel othersEntry = new TrackerDetailsModel(activity.getString(R.string.others), othersCount);
            details.add(othersEntry);
        }
        adapter.updateList(details);
        setTableVisibility(details);
    }

    void onConfigurationChanged(Configuration configuration) {
        setupPopup(configuration);
    }

    @Override
    public void setOnDismissListener(OnDismissListener onDismissListener) {
        super.setOnDismissListener(onDismissListener);
        telemetry.sendAntiTrackingHideSignal();
    }
}
