package com.cliqz.browser.controlcenter;

import android.content.res.Resources;
import android.graphics.PorterDuff;
import android.support.annotation.AttrRes;
import android.support.annotation.ColorRes;
import android.support.v7.widget.RecyclerView;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;

import java.util.ArrayList;
import java.util.Locale;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
class TrackersListAdapter extends RecyclerView.Adapter<TrackersListAdapter.ViewHolder> {

    private ArrayList<TrackerDetailsModel> trackerDetails;
    private final boolean isIncognito;
    private final Bus bus;
    private final Telemetry telemetry;
    private boolean isEnabled = true;
    private @ColorRes int mColorEnabled;
    private @ColorRes int mColorDisabled;

    TrackersListAdapter(boolean isIncognito, AntiTrackingFragment antiTrackingFragment) {
        this.trackerDetails = new ArrayList<>();
        this.isIncognito = isIncognito;
        this.bus = antiTrackingFragment.bus;
        this.telemetry = antiTrackingFragment.telemetry;
        mColorDisabled = getThemeColor(antiTrackingFragment.getContext().getTheme(), R.attr.colorSecondary);
        mColorEnabled = getThemeColor(antiTrackingFragment.getContext().getTheme(), R.attr.colorPrimary);
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
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
        holder.infoImage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                final int position = holder.getAdapterPosition();
                telemetry.sendCCCompanyInfoSignal(position, TelemetryKeys.ATTRACK);
                bus.post(new Messages.DismissControlCenter());
                final String companyName = details.companyName.replaceAll("\\s", "-");
                final String url =
                        String.format("https://cliqz.com/whycliqz/anti-tracking/tracker#%s", companyName);
                bus.post(new BrowserEvents.OpenUrlInNewTab(url, isIncognito));
            }
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

        ViewHolder(View view) {
            super(view);
            trackerName = (TextView) view.findViewById(R.id.tracker_name);
            trackerCount = (TextView) view.findViewById(R.id.tracker_count);
            infoImage = (ImageView) view.findViewById(R.id.info);
        }
    }

    void updateList(ArrayList<TrackerDetailsModel> trackerDetails) {
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
