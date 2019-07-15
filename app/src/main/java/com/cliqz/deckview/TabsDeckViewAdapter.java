package com.cliqz.deckview;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.ColorInt;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.content.res.AppCompatResources;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.search.DefaultIconDrawable;
import com.cliqz.browser.main.search.Logo;
import com.cliqz.jsengine.JSBridge;
import com.facebook.react.bridge.ReadableMap;


/**
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
class TabsDeckViewAdapter extends RecyclerView.Adapter<ViewHolder> {

    private static final String BACKGROUND_COLOR_KEY = "backgroundColor";
    private static final String BACKGROUND_IMAGE_KEY = "backgroundImage";
    private static final String RESULT_KEY = "result";
    private static final String TEXT_KEY = "text";
    private static final int INCOGNITO_TYPE = 23;
    private static final int REGULAR_TYPE = 19;
    private final TabsDeckView tabsDeckView;
    private final LayoutInflater inflater;
    private final Drawable tabDefaultIcon;
    private final Context context;
    private static final String GET_LOGO_FUNCTION = "getLogoDetails";
    private final int defaultBackgroundColor;

    TabsDeckViewAdapter(TabsDeckView tabsDeckView) {
        this.tabsDeckView = tabsDeckView;
        this.context = tabsDeckView.getContext();
        this.inflater = LayoutInflater.from(context);
        this.tabDefaultIcon = AppCompatResources.getDrawable(context, R.drawable.logo_start_tab);
        this.defaultBackgroundColor = BuildConfig.IS_LUMEN ?
                ContextCompat.getColor(context, R.color.secondary_color) :
                ContextCompat.getColor(context, R.color.accent_color);
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        final View card;
        card = inflater.inflate(R.layout.deckview_tab_layout, parent, false);
        if (viewType == INCOGNITO_TYPE) {
            card.setId(R.id.incognito_tab_id);
        } else {
            card.setId(R.id.regular_tab_id);
        }
        final ViewHolder viewHolder = new ViewHolder(tabsDeckView, card);
        viewHolder.setIncognito(viewType == INCOGNITO_TYPE);
        return viewHolder;
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        final CliqzBrowserState entry = tabsDeckView.entries.get(position);
        final String entryTitle = entry.getTitle();
        final String entryUrl = entry.getUrl();
        final Mode mode = entry.getMode();
        final String title;
        final String url;
        if (mode == Mode.WEBPAGE) {
            url = entryUrl;
            title = entryTitle.isEmpty() ? context.getString(R.string.untitled) : entryTitle;
        } else {
            url = context.getString(R.string.action_new_tab);
            title = context.getString(R.string.home_title);
        }
        holder.urlTv.setText(url);
        final Typeface typeface = holder.titleTv.getTypeface();
        if (BuildConfig.IS_LUMEN && entry.isSelected()) {
            holder.titleTv.setTypeface(null, Typeface.BOLD);
        } else {
            holder.titleTv.setTypeface(null, Typeface.NORMAL);
        }
        holder.titleTv.setText(title);

        if (mode != Mode.WEBPAGE || entry.getFavIcon() == null) {
            holder.favIconIV.setImageResource(R.drawable.tab_default_favicon);
        } else {
            holder.favIconIV.setImageBitmap(entry.getFavIcon());
        }

        if (mode == Mode.WEBPAGE) {
            tabsDeckView.engine.callAction(GET_LOGO_FUNCTION, new LogoMetadataResult(holder), url);
        } else {
            holder.bigIconIV.getHierarchy()
                    .setImage(tabDefaultIcon, 1.0f, true);
            holder.backgroundView
                    .setBackgroundColor(defaultBackgroundColor);
        }
    }

    @Override
    public int getItemViewType(int position) {
        final CliqzBrowserState entry = tabsDeckView.entries.get(position);
        return entry.isIncognito() ? INCOGNITO_TYPE : REGULAR_TYPE;
    }

    @Override
    public int getItemCount() {
        return tabsDeckView.entries.size();
    }

    @Nullable
    CliqzBrowserState remove(int position) {
        if (position >= tabsDeckView.entries.size()) {
            return null;
        }
        final CliqzBrowserState state = tabsDeckView.entries.get(position);
        tabsDeckView.entries.remove(position);
        notifyItemRemoved(position);
        return state;
    }

    private class LogoMetadataResult implements JSBridge.Callback {
        private final ViewHolder holder;

        LogoMetadataResult(ViewHolder holder) {
            this.holder = holder;
        }

        @Override
        public void callback(final ReadableMap content) {
            final ReadableMap result = content.getMap(RESULT_KEY);
            assert result != null;
            final Resources resources = context.getResources();
            final String rawIconUrl = result.hasKey(BACKGROUND_IMAGE_KEY) ?
                    result.getString(BACKGROUND_IMAGE_KEY) : null;
            final String text = result.hasKey(TEXT_KEY) ?
                    result.getString(TEXT_KEY) : "";
            final @ColorInt int color = result.hasKey(BACKGROUND_COLOR_KEY) ?
                    0xff000000 | decodeColor(result.getString(BACKGROUND_COLOR_KEY)) :
                    ContextCompat.getColor(context, R.color.accent_color);
            assert text != null;
            final Drawable textDrawable = new DefaultIconDrawable(text, color,
                    resources.getDimensionPixelSize(R.dimen.fallback_logo_text_size),
                    0);
            final int logoSize = (int) resources.getDimension(R.dimen.tab_icon_size);
            final String iconUrl = Logo.getUriFromSvgUri(rawIconUrl, logoSize, logoSize);
            tabsDeckView.post(() -> {
                holder.bigIconIV.getHierarchy().setFailureImage(text.isEmpty() ?
                        tabDefaultIcon: textDrawable);
                holder.bigIconIV.setImageURI(iconUrl);
                final int noAlphaColor = 0xff000000 | color;
                holder.backgroundView.setBackgroundColor(noAlphaColor);
            });
        }
    }

    private @ColorInt int decodeColor(String color) {
        try {
            return Integer.parseInt(color, 16);
        } catch (Throwable e) {
            return ContextCompat.getColor(context, R.color.default_tab_bg);
        }
    }
}
