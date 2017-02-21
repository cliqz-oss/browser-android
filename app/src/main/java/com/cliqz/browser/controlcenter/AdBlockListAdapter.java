package com.cliqz.browser.controlcenter;

import android.graphics.PorterDuff;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.utils.Telemetry;
import com.squareup.otto.Bus;

import java.util.ArrayList;

import acr.browser.lightning.bus.BrowserEvents;

/**
 * Created by Ravjit on 18/11/16.
 */

public class  AdBlockListAdapter extends RecyclerView.Adapter<AdBlockListAdapter.ViewHolder> {

    private ArrayList<AdBlockDetailsModel> trackerDetails;
    private final boolean isIncognito;
    private final Bus bus;
    private final Telemetry telemetry;

    public AdBlockListAdapter(boolean isIncognito, AdBlockingFragment antiTrackingFragment) {
        this.trackerDetails = new ArrayList<>();
        this.isIncognito = isIncognito;
        this.bus = antiTrackingFragment.bus;
        this.telemetry = antiTrackingFragment.telemetry;
    }

    @Override
    public AdBlockListAdapter.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        final View view = inflater.inflate(R.layout.tracker_details_list_item, parent, false);
        return new AdBlockListAdapter.ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(final AdBlockListAdapter.ViewHolder holder, int position) {
        final int textColor = isIncognito ? R.color.normal_tab_primary_color : R.color.incognito_tab_primary_color;
        final AdBlockDetailsModel details = trackerDetails.get(position);
        holder.trackerName.setText(details.companyName);
        holder.trackerCount.setText(Integer.toString(trackerDetails.get(position).adBlockCount));
        holder.trackerName.setTextColor(ContextCompat.getColor(BrowserApp.getAppContext(), textColor));
        holder.trackerCount.setTextColor(ContextCompat.getColor(BrowserApp.getAppContext(), textColor));
        holder.infoImage.getDrawable().setColorFilter(ContextCompat.getColor(BrowserApp.getAppContext(), textColor), PorterDuff.Mode.SRC_ATOP);
        holder.infoImage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                final int position = holder.getAdapterPosition();
                telemetry.sendAntiTrackingInfoSignal(position);
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

        public final TextView trackerName;
        public final TextView trackerCount;
        public final ImageView infoImage;

        public ViewHolder(View view) {
            super(view);
            trackerName = (TextView) view.findViewById(R.id.tracker_name);
            trackerCount = (TextView) view.findViewById(R.id.tracker_count);
            infoImage = (ImageView) view.findViewById(R.id.info);
        }
    }
    public void updateList(ArrayList<AdBlockDetailsModel> trackerDetails) {
        this.trackerDetails = trackerDetails;
        notifyDataSetChanged();
    }
}