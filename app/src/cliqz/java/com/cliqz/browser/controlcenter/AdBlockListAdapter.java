package com.cliqz.browser.controlcenter;

import android.annotation.SuppressLint;
import android.content.res.Resources;
import android.graphics.PorterDuff;
import androidx.annotation.AttrRes;
import androidx.annotation.ColorRes;
import androidx.recyclerview.widget.RecyclerView;
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

import acr.browser.lightning.bus.BrowserEvents;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
class  AdBlockListAdapter extends RecyclerView.Adapter<AdBlockListAdapter.ViewHolder> {

    private ArrayList<AdBlockDetailsModel> trackerDetails;
    private final boolean isIncognito;
    private final Bus bus;
    private final Telemetry telemetry;
    private boolean isEnabled = true;
    private @ColorRes int mColorEnabled;
    private @ColorRes int mColorDisabled;

    AdBlockListAdapter(boolean isIncognito, AdBlockingFragment antiTrackingFragment) {
        this.trackerDetails = new ArrayList<>();
        this.isIncognito = isIncognito;
        this.bus = antiTrackingFragment.bus;
        this.telemetry = antiTrackingFragment.telemetry;
        mColorDisabled = getThemeColor(antiTrackingFragment.getContext().getTheme(), R.attr.colorSecondary);
        mColorEnabled = getThemeColor(antiTrackingFragment.getContext().getTheme(), R.attr.colorPrimary);
    }

    @Override
    public AdBlockListAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        final View view = inflater.inflate(R.layout.tracker_details_list_item, parent, false);
        return new AdBlockListAdapter.ViewHolder(view);
    }

    @SuppressLint("SetTextI18n")
    @Override
    public void onBindViewHolder(final AdBlockListAdapter.ViewHolder holder, int position) {
        final AdBlockDetailsModel details = trackerDetails.get(position);
        holder.trackerName.setText(details.companyName);
        holder.trackerCount.setText(Integer.toString(trackerDetails.get(position).adBlockCount));
        holder.infoImage.setColorFilter(isEnabled ? mColorEnabled : mColorDisabled, PorterDuff.Mode.SRC_IN);
        holder.infoImage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                final int position = holder.getAdapterPosition();
                telemetry.sendCCCompanyInfoSignal(position, TelemetryKeys.ADBLOCK);
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

    void updateList(ArrayList<AdBlockDetailsModel> trackerDetails) {
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
