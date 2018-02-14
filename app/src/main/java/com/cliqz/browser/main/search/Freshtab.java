package com.cliqz.browser.main.search;

import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.support.annotation.ColorInt;
import android.support.annotation.NonNull;
import android.support.v4.content.ContextCompat;
import android.support.v7.content.res.AppCompatResources;
import android.text.Spannable;
import android.text.SpannableStringBuilder;
import android.text.style.ForegroundColorSpan;
import android.util.AttributeSet;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.GridView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.utils.LocationCache;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.utils.UrlUtils;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;


/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class Freshtab extends FrameLayout implements NewsFetcher.OnTaskCompleted{

    private static final int COLLAPSED_NEWS_NO = 2;

    @Bind(R.id.topsites_grid)
    GridView topsitesGridView;

    @Bind(R.id.topnews_list)
    LinearLayout topnewsListView;

    @Bind(R.id.topsites_header)
    TextView topsitesHeader;

    @Bind(R.id.news_label)
    TextView newsLabel;

    RemoveTopsitesOverlay overlay;

    private TopsitesAdapter topsitesAdapter;

    @Inject
    Bus bus;

    @Inject
    Engine engine;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    Telemetry telemetry;

    @Inject
    HistoryDatabase historyDatabase;

    @Inject
    MainActivityHandler handler;

    @Inject
    LocationCache locationCache;

    private final Drawable expandNewsIcon, collapseNewsIcon;
    private boolean isNewsExpanded = false;

    public Freshtab(Context context) {
        this(context, null);
    }

    public Freshtab(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public Freshtab(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        expandNewsIcon = AppCompatResources.getDrawable(context, R.drawable.ic_action_expand);
        collapseNewsIcon = AppCompatResources.getDrawable(context, R.drawable.ic_action_collapse);
        init();
    }

    private void init() {
        inflate(getContext(), R.layout.freshtab, this);

        this.setVisibility(View.VISIBLE);
        ButterKnife.bind(this, this);

        final MainActivityComponent component = BrowserApp.getActivityComponent(getContext());
        if (component != null) {
            component.inject(this);
        }

        newsLabel.setCompoundDrawablesWithIntrinsicBounds(null, null,
                expandNewsIcon, null);

        overlay = new RemoveTopsitesOverlay(this);
        topsitesAdapter = new TopsitesAdapter(historyDatabase, engine, handler);

        topsitesGridView.setAdapter(topsitesAdapter);

        final TopsitesEventsListener topsitesEventsListener =
                new TopsitesEventsListener(this);
        topsitesGridView.setOnItemLongClickListener(topsitesEventsListener);
        topsitesGridView.setOnItemClickListener(topsitesEventsListener);
        updateFreshTab();
    }

    @OnClick(R.id.news_label)
    void onNewsLabelClicked() {
        isNewsExpanded = !isNewsExpanded;
        newsLabel.setCompoundDrawablesWithIntrinsicBounds(null, null,
                isNewsExpanded ? collapseNewsIcon : expandNewsIcon, null);
        final int count = topnewsListView.getChildCount();
        for (int i = 0; i < count; i++) {
            final View view = topnewsListView.getChildAt(i);
            if (!isNewsExpanded && i >= COLLAPSED_NEWS_NO) {
                view.setVisibility(GONE);
            } else {
                view.setVisibility(VISIBLE);
            }
        }
        telemetry.sendMoreNewsSignal(isNewsExpanded);
        bus.post(new CliqzMessages.HideKeyboard());
    }

    private void getTopnews() {
        if (preferenceManager.shouldShowNews()) {
            topnewsListView.setVisibility(VISIBLE);
            newsLabel.setVisibility(VISIBLE);
            new NewsFetcher(this).execute(NewsFetcher.getTopNewsUrl(preferenceManager,
                    Integer.MAX_VALUE, locationCache));
        } else {
            topnewsListView.setVisibility(GONE);
            newsLabel.setVisibility(GONE);
        }
    }

    @Override
    public void bringToFront() {
        if (getVisibility() == VISIBLE) {
            return;
        }
        super.bringToFront();
        updateFreshTab();
    }

    public void updateFreshTab() {
        // TODO @Khaled: please pull news every 30 minutes instead every time the view is brought to front
        refreshTopsites();
        getTopnews();
    }

    public void refreshTopsites() {
        if (preferenceManager.shouldShowTopSites()) {
            topsitesGridView.setVisibility(VISIBLE);
            topsitesHeader.setVisibility(VISIBLE);
            topsitesAdapter.fetchTopsites();
            updateTopsitesHeader(topsitesAdapter.getDisplayedCount());
        } else {
            topsitesGridView.setVisibility(GONE);
            topsitesHeader.setVisibility(GONE);
        }
    }

    void updateTopsitesHeader(int topsitesCount) {
        topsitesHeader.setVisibility(topsitesCount == 0 ? View.VISIBLE : View.INVISIBLE);
    }

    @Override
    public void setVisibility(int visibility) {
        super.setVisibility(visibility);
        if (visibility == VISIBLE) {
            if (bus != null) {
                bus.post(new Messages.OnFreshTabVisible());
            }
        }
    }

    @Override
    public void onTaskCompleted(List<Topnews> topnews, int breakingNewsCount, int localNewsCount,
                                String newsVersion) {
        if (topnews == null || topnews.isEmpty()) {
            return;
        }
        topnewsListView.removeAllViews();
        final LayoutInflater inflater = LayoutInflater.from(getContext());
        int count = 0;
        for (final Topnews piece: topnews) {
            final View view = inflater.inflate(R.layout.news_layout, topnewsListView, false);
            final NewsViewHolder holder = new NewsViewHolder(view, count++, piece, telemetry, bus);
            holder.setUrl(piece.url);
            holder.titleView.setText(buildTitleSpannable(piece));
            holder.urlView.setText(UrlUtils.getTopDomain(piece.url));
            engine.callAction("getLogoDetails", new FreshtabGetLogoCallback(holder, handler), piece.url);
            if (!isNewsExpanded && count > COLLAPSED_NEWS_NO) {
                view.setVisibility(GONE);
            }
            topnewsListView.addView(view);
        }
        telemetry.sendFreshtabShowTelemetry(isNewsExpanded ? topnews.size() : COLLAPSED_NEWS_NO,
                topnews.size(), breakingNewsCount, localNewsCount, topnews.size(), newsVersion);
    }

    private CharSequence buildTitleSpannable(Topnews piece) {
        final SpannableStringBuilder builder = new SpannableStringBuilder();
        if (piece.breaking && piece.breakingLabel != null && !piece.breakingLabel.isEmpty()) {
            appendLabel(builder, piece.breakingLabel.toUpperCase(), Color.RED);
        }
        if (piece.isLocalNews && piece.localLabel != null && !piece.localLabel.isEmpty()) {
            final @ColorInt int color =
                    ContextCompat.getColor(getContext(), R.color.primary_color);
            appendLabel(builder, piece.localLabel.toUpperCase(), color);
        }
        builder.append(piece.title);
        return builder;
    }

    private void appendLabel(@NonNull SpannableStringBuilder builder, @NonNull String str,
                             @ColorInt int color) {
        final int oldLen = builder.length();
        builder.append(str).append(": ");
        builder.setSpan(new ForegroundColorSpan(color), oldLen, builder.length(),
                Spannable.SPAN_INCLUSIVE_EXCLUSIVE);
    }

    @Override
    public boolean onInterceptTouchEvent(MotionEvent ev) {
        if (ev.getAction() == MotionEvent.ACTION_DOWN && !hasFocus()) {
            requestFocus();
        }
        return super.onInterceptTouchEvent(ev);
    }
}
