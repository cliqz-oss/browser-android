package com.cliqz.browser.main;

import android.app.Activity;
import android.graphics.PorterDuff;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.PopupWindow;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;

import java.util.ArrayList;
import java.util.Locale;

import acr.browser.lightning.constant.Constants;

/**
 * Created by Ravjit on 07/09/16.
 */
public class AntiTrackingDialog {

    private static final String antiTrackingHelpUrlDe = "https://cliqz.com/whycliqz/anti-tracking";
    private static final String antiTrackingHelpUrlEn = "https://cliqz.com/en/whycliqz/anti-tracking";

    private final ArrayList<TrackerDetailsModel> details;
    private final int trackerCount;
    private final Activity activity;
    private final boolean isIncognito;
    private final Bus bus;
    private final Telemetry telemetry;
    private PopupWindow dialog;

    public AntiTrackingDialog(Activity activity, ArrayList<TrackerDetailsModel> details,
                              int trackerCount, boolean isIncognito, Bus bus, Telemetry telemetry) {
        this.details = details;
        this.trackerCount = trackerCount;
        this.activity = activity;
        this.isIncognito = isIncognito;
        this.bus = bus;
        this.telemetry = telemetry;
        setup();
    }

    private void setup() {
        int trackerPoints = 0;
        for (TrackerDetailsModel model: details) {
            trackerPoints += model.trackerCount;
        }
        final int othersCount = trackerCount - trackerPoints;
        if (othersCount > 0) {
            final TrackerDetailsModel othersEntry = new TrackerDetailsModel(activity.getString(R.string.others), othersCount);
            details.add(othersEntry);
        }
        final View popupView = activity.getLayoutInflater().inflate(R.layout.anti_tracking_dialog, null);
        final int popupBgColor = isIncognito ? R.color.incognito_tab_primary_color : R.color.normal_tab_primary_color;
        final int popupTextColor = isIncognito ? R.color.normal_tab_primary_color : R.color.incognito_tab_primary_color;
        popupView.setBackgroundColor(ContextCompat.getColor(activity, popupBgColor));
        popupView.setAlpha(0.95f);
        dialog = new PopupWindow(popupView, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT);
        final TextView counter = (TextView) popupView.findViewById(R.id.counter);
        final RecyclerView trackersList = (RecyclerView) popupView.findViewById(R.id.trackers_list);
        final Button helpButton = (Button) popupView.findViewById(R.id.help);
        final TextView companiesHeader = (TextView) popupView.findViewById(R.id.companies_header);
        final TextView counterHeader = (TextView) popupView.findViewById(R.id.counter_header);
        final View upperLine = popupView.findViewById(R.id.upperLine);
        final View lowerLine = popupView.findViewById(R.id.lowerLine);
        helpButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                telemetry.sendAntiTrackingHelpSignal();
                final Bundle args = new Bundle();
                //TODO Restore this when english website is launced
//                final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
//                        antiTrackingHelpUrlDe : antiTrackingHelpUrlEn;
                final String helpUrl = antiTrackingHelpUrlDe;
                args.putString(Constants.KEY_URL, helpUrl);
                ((MainActivity)activity).tabsManager.addNewTab(args);
                dialog.dismiss();
            }
        });
        companiesHeader.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        counterHeader.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        counter.setTextColor(ContextCompat.getColor(activity, popupTextColor));
        helpButton.setTextColor(ContextCompat.getColor(activity, popupBgColor));
        helpButton.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
        upperLine.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
        lowerLine.getBackground().setColorFilter(ContextCompat.getColor(activity, popupTextColor), PorterDuff.Mode.SRC_ATOP);
        counter.setText(Integer.toString(trackerCount));
        trackersList.setLayoutManager(new LinearLayoutManager(activity));
        trackersList.setAdapter(new TrackersListAdapter(details, isIncognito, activity, bus, dialog, telemetry));
        dialog.setBackgroundDrawable(new ColorDrawable());
        dialog.setOutsideTouchable(true);
        dialog.setFocusable(true);
    }

    public void show(View anchor) {
        dialog.showAsDropDown(anchor);
    }
}
