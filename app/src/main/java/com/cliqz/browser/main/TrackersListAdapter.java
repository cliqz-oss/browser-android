package com.cliqz.browser.main;

import android.content.Context;
import android.graphics.PorterDuff;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.URLUtil;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.squareup.otto.Bus;

import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.utils.UrlUtils;

/**
 * Created by Ravjit on 02/08/16.
 */
public class TrackersListAdapter extends RecyclerView.Adapter<TrackersListAdapter.ViewHolder> {

    private final ArrayList<TrackerDetailsModel> trackerDetails;
    private final boolean isIncognito;
    private final Context context;
    private final PopupWindow popup;
    private final Bus bus;

    public TrackersListAdapter(ArrayList<TrackerDetailsModel> trackerDetails, boolean isIncognito,
                               Context context, Bus bus, PopupWindow window) {
        this.trackerDetails = trackerDetails;
        this.isIncognito = isIncognito;
        this.context = context;
        this.bus = bus;
        this.popup = window;
    }

    @Override
    public ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        final View view = inflater.inflate(R.layout.tracker_details_list_item, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(ViewHolder holder, final int position) {
        final int textColor = isIncognito ? R.color.normal_tab_primary_color : R.color.incognito_tab_primary_color;
        final TrackerDetailsModel details = trackerDetails.get(position);
        holder.trackerName.setText(details.companyName);
        holder.trackerCount.setText(Integer.toString(trackerDetails.get(position).trackerCount));
        holder.trackerName.setTextColor(ContextCompat.getColor(context, textColor));
        holder.trackerCount.setTextColor(ContextCompat.getColor(context, textColor));
        holder.infoImage.getDrawable().setColorFilter(ContextCompat.getColor(context, textColor), PorterDuff.Mode.SRC_ATOP);
        holder.infoImage.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                popup.dismiss();
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
}
