package com.cliqz.browser.main;

import android.os.Build;
import android.os.Handler;
import androidx.recyclerview.widget.RecyclerView;
import android.text.Html;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.search.IconViewHolder;
import com.cliqz.browser.main.search.FreshtabGetLogoCallback;
import com.cliqz.jsengine.Engine;

import java.net.MalformedURLException;
import java.net.URL;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;


/**
 * @author vishnu
 * @author Ravjit Singh
 */
class HistoryAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    interface ClickListener {
        void onClick(View view, int position);

        void onLongPress(View view, int position);
    }

    static final int VIEW_TYPE_DATE = 0;
    static final int VIEW_TYPE_HISTORY = 1;
    static final int VIEW_TYPE_QUERY = 2;

    private ArrayList<HistoryModel> historyList;
    private Engine engine;
    private Handler handler;

    ArrayList<Integer> multiSelectList = new ArrayList<>();
    private ClickListener clickListener;

    HistoryAdapter(ArrayList<HistoryModel> historyList, Engine engine, Handler handler,
                   ClickListener clickListener) {
        this.historyList = historyList;
        this.engine = engine;
        this.handler = handler;
        this.clickListener = clickListener;
    }

    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final View view;
        switch (viewType) {
            case VIEW_TYPE_HISTORY:
                view = LayoutInflater.from(parent.getContext()).inflate(R.layout.history_viewholder,
                        parent, false);
                return new HistoryViewHolder(view);
            case VIEW_TYPE_DATE:
                view = LayoutInflater.from(parent.getContext()).inflate(R.layout.history_list_date,
                        parent, false);
                return new DateViewHolder(view);
            case VIEW_TYPE_QUERY:
                view = LayoutInflater.from(parent.getContext()).inflate(R.layout.query_viewholder,
                        parent, false);
                return new QueryViewHolder(view);
            default:
                //should never be this case
                return null;
        }
    }

    @Override
    public void onBindViewHolder(RecyclerView.ViewHolder holder, int position) {

        String visitedTime = null;
        String visitedDate = null;
        final Locale defaultLocale = Locale.getDefault();
        final DateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", defaultLocale);
        final DateFormat visitedTimeFormat = new SimpleDateFormat("HH:mm", defaultLocale);
        final DateFormat visitedDateFormat = new SimpleDateFormat("dd-MM-yyyy", defaultLocale);

        final String time = historyList.get(position).getTime();

        try {
            dateFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = dateFormat.parse(time);
            visitedDateFormat.setTimeZone(TimeZone.getDefault());
            visitedTimeFormat.setTimeZone(TimeZone.getDefault());
            visitedDate = visitedDateFormat.format(date);
            visitedTime = visitedTimeFormat.format(date);
        } catch (ParseException e) {
            e.printStackTrace();
        }

        switch (holder.getItemViewType()) {
            case VIEW_TYPE_HISTORY:
                String url;
                try {
                    url = new URL(historyList.get(position).getUrl()).getHost();
                } catch (MalformedURLException e) {
                    url = historyList.get(position).getUrl();
                    e.printStackTrace();
                }
                final HistoryViewHolder historyViewHolder = (HistoryViewHolder) holder;
                historyViewHolder.url.setText(url);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    historyViewHolder.title.setText(Html.fromHtml(historyList.get(position).getTitle()
                            + "&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;", Html.FROM_HTML_MODE_LEGACY));
                } else {
                    historyViewHolder.title.setText(Html.fromHtml(historyList.get(position).getTitle()
                            + "&#160;&#160;&#160;&#160;&#160;&#160;&#160;&#160;")); //simple solution
                }
                historyViewHolder.time.setText(visitedTime);
                loadIcon(historyViewHolder, historyList.get(position).getUrl());
                if (multiSelectList.contains(position)) {
                    historyViewHolder.selectedOverlay.setBackgroundColor(0x7700AEF0);
                } else {
                    historyViewHolder.selectedOverlay.setBackgroundColor(0x00000000);
                }
                break;
            case VIEW_TYPE_DATE:
                final DateViewHolder dateViewHolder = (DateViewHolder) holder;
                dateViewHolder.date.setText(visitedDate);
                break;
            case VIEW_TYPE_QUERY:
                final QueryViewHolder queryViewHolder = (QueryViewHolder) holder;
                queryViewHolder.query.setText(historyList.get(position).getUrl());
                queryViewHolder.time.setText(visitedTime);
                if (multiSelectList.contains(position)) {
                    queryViewHolder.selectedOverlay.setBackgroundColor(0x7700AEF0);
                } else {
                    queryViewHolder.selectedOverlay.setBackgroundColor(0x00000000);
                }
                break;
        }
    }

    @Override
    public int getItemCount() {
        return historyList.size();
    }

    @Override
    public int getItemViewType(int position) {
        return historyList.get(position).getType();
    }

    private void loadIcon(final HistoryViewHolder holder, String url) {
        engine.callAction("getLogoDetails", new FreshtabGetLogoCallback(holder, handler), url);
    }

    private class HistoryViewHolder extends IconViewHolder {

        public TextView url;
        public TextView title;
        public TextView time;
        View selectedOverlay;
        View historyViewParent;

        HistoryViewHolder(View view) {
            super(view);
            url = view.findViewById(R.id.history_url);
            title = view.findViewById(R.id.history_title);
            time = view.findViewById(R.id.history_time);
            selectedOverlay = view.findViewById(R.id.selectedOverLay);
            historyViewParent = view.findViewById(R.id.history_view_parent);
            historyViewParent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    clickListener.onClick(v, getAdapterPosition());
                }
            });
            historyViewParent.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    clickListener.onLongPress(v, getAdapterPosition());
                    return true;
                }
            });
        }


    }

    class DateViewHolder extends RecyclerView.ViewHolder {

        public TextView date;

        DateViewHolder(View view) {
            super(view);
            date = view.findViewById(R.id.history_date);
        }
    }

    private class QueryViewHolder extends RecyclerView.ViewHolder {

        public TextView query;
        public TextView time;
        View selectedOverlay;
        View queryViewParent;

        QueryViewHolder(View view) {
            super(view);
            query = view.findViewById(R.id.query);
            time = view.findViewById(R.id.query_time);
            selectedOverlay = view.findViewById(R.id.selectedOverLay);
            queryViewParent = view.findViewById(R.id.query_view_parent);
            queryViewParent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    clickListener.onClick(v, getAdapterPosition());
                }
            });
            queryViewParent.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    clickListener.onLongPress(v, getAdapterPosition());
                    return true;
                }
            });
        }
    }
}