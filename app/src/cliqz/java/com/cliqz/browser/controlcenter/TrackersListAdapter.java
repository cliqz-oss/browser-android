package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.PorterDuff;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.AttrRes;
import androidx.annotation.ColorRes;
import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;
import com.facebook.react.bridge.AssertionException;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
class TrackersListAdapter extends RecyclerView.Adapter<TrackersListAdapter.ViewHolder> {

    private List<TrackerDetailsModel> trackerDetails;
    private final boolean isIncognito;
    private final Bus bus;
    private final Telemetry telemetry;
    private final String tabId;
    private boolean isEnabled = true;
    private @ColorRes int mColorEnabled;
    private @ColorRes int mColorDisabled;

    TrackersListAdapter(boolean isIncognito, AntiTrackingFragment antiTrackingFragment) {
        this.trackerDetails = new ArrayList<>();
        this.isIncognito = isIncognito;
        this.bus = antiTrackingFragment.bus;
        this.tabId = antiTrackingFragment.getTabId();
        this.telemetry = antiTrackingFragment.telemetry;
        final Context context = antiTrackingFragment.getContext();
        if (context == null) {
            throw new AssertionException("The context is null");
        }
        mColorDisabled = getThemeColor(context.getTheme(), R.attr.colorSecondary);
        mColorEnabled = getThemeColor(context.getTheme(), R.attr.colorPrimary);
    }

    @Override
    @NonNull
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        final View view = inflater.inflate(R.layout.tracker_details_list_item, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(final ViewHolder holder, int position) {
        final TrackerDetailsModel details = trackerDetails.get(position);
        holder.trackerName.setText(details.companyName);
        holder.trackerCount.setText(String.format(Locale.getDefault(), "%d", trackerDetails.get(position).trackerCount));
        holder.infoImage.setColorFilter(isEnabled ? mColorEnabled : mColorDisabled, PorterDuff.Mode.SRC_IN);
        holder.infoImage.setOnClickListener(v -> {
            final int position1 = holder.getAdapterPosition();
            telemetry.sendCCCompanyInfoSignal(position1, TelemetryKeys.ATTRACK);
            bus.post(new Messages.DismissControlCenter());
            final String url = String.format("https://whotracks.me/trackers/%s.html", details.wtm);
            bus.post(new BrowserEvents.OpenUrlInNewTab(tabId, url, isIncognito, true));
        });
    }

    @Override
    public int getItemCount() {
        return trackerDetails.size();
    }

    class ViewHolder extends RecyclerView.ViewHolder {

        final TextView trackerName;
        final TextView trackerCount;
        final ImageView infoImage;

        @SuppressWarnings("RedundantCast")
        ViewHolder(View view) {
            super(view);
            trackerName = (TextView) view.findViewById(R.id.tracker_name);
            trackerCount = (TextView) view.findViewById(R.id.tracker_count);
            infoImage = (ImageView) view.findViewById(R.id.info);
        }
    }

    void updateList(List<TrackerDetailsModel> trackerDetails) {
        this.trackerDetails = trackerDetails;
        notifyDataSetChanged();
    }

    @ColorRes
    private int getThemeColor(Resources.Theme theme, @AttrRes int colorAttr) {
        final TypedValue outValue = new TypedValue();
        theme.resolveAttribute(colorAttr, outValue, true);
        return outValue.data;
    }

    void setEnabled(boolean isEnabled) {
        this.isEnabled = isEnabled;
    }
}
