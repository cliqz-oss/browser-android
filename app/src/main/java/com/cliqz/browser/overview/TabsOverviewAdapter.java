package com.cliqz.browser.overview;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.TabFragment;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.utils.Telemetry;

/**
 * Created by Ravjit on 25/07/16.
 */
public class TabsOverviewAdapter extends RecyclerView.Adapter<TabsOverviewAdapter.TabViewHolder> {

    private final Bitmap defaultFavicon;

    private final Context context;
    private final int layoutResourceId;
    private final TabsManager tabsManager;
    private final Telemetry telemetry;

    public TabsOverviewAdapter(Context context, int layoutResourceId, TabsManager tabsManager, Telemetry telemetry) {
        this.defaultFavicon = BitmapFactory.decodeResource(context.getResources(), R.drawable.ic_webpage);
        this.context = context;
        this.layoutResourceId = layoutResourceId;
        this.tabsManager = tabsManager;
        this.telemetry = telemetry;
    }

    @Override
    public TabViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final LayoutInflater inflater = LayoutInflater.from(parent.getContext());
        final View view = inflater.inflate(layoutResourceId, parent, false);
        return new TabViewHolder(view);
    }

    @Override
    public void onBindViewHolder(final TabViewHolder holder, int position) {
        holder.layout.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                final int position = holder.getAdapterPosition();
                tabsManager.showTab(position);
                telemetry.sendTabOpenSignal(position, tabsManager.getTabCount(),
                        tabsManager.getTab(position).state.isIncognito());
            }
        });
        TabFragment tabFragment = tabsManager.getTab(position);
        final String title;
        final String url = tabFragment.state.getUrl();
        if (tabFragment.state.getMode() == CliqzBrowserState.Mode.SEARCH) {
            title = tabFragment.state.getQuery();
        } else {
            title = tabFragment.state.getTitle();
        }
        holder.title.setText(title.isEmpty() ? context.getString(R.string.home_title) : title);
        holder.domain.setText(url.isEmpty() ? context.getString(R.string.action_new_tab) : url);
        final Bitmap favIcon = tabFragment.getFavicon();
        holder.icon.setImageBitmap(favIcon != null ? favIcon : defaultFavicon);
        if (tabFragment.state.isIncognito()) {
            holder.layout.setBackgroundColor(ContextCompat.getColor(context, R.color.incognito_tab_primary_color));
            holder.title.setTextColor(ContextCompat.getColor(context, R.color.normal_tab_primary_color));
        }
//        if (position == tabsManager.getCurrentTabPosition()) {
//            holder.layout.setBackgroundColor(ContextCompat.getColor(context, R.color.gray_list_bg));
//        } else {
//            holder.layout.setBackgroundColor(ContextCompat.getColor(context, R.color.white));
//        }
    }

    @Override
    public int getItemCount() {
        return tabsManager.getTabCount();
    }

    public class TabViewHolder extends RecyclerView.ViewHolder {

        final TextView title;
        final TextView domain;
        final ImageView icon;
        final RelativeLayout layout;

        public TabViewHolder(View view) {
            super(view);
            title = (TextView) view.findViewById(R.id.page_title);
            domain = (TextView) view.findViewById(R.id.page_domain);
            icon = (ImageView) view.findViewById(R.id.faviconTab);
            layout = (RelativeLayout) view.findViewById(R.id.tab_item_background);
        }
    }
}
