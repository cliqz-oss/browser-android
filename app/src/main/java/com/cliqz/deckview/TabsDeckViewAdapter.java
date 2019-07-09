package com.cliqz.deckview;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Drawable;
import androidx.annotation.ColorInt;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.CliqzBrowserState.Mode;
import com.cliqz.browser.main.search.DefaultIconDrawable;
import com.cliqz.browser.main.search.Logo;
import com.cliqz.jsengine.JSBridge;
import com.facebook.react.bridge.ReadableMap;

import org.jetbrains.annotations.NotNull;

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
    private final Bitmap defaultFavicon;
    private final int defaultBackgroundColor;

    TabsDeckViewAdapter(TabsDeckView tabsDeckView) {
        this.tabsDeckView = tabsDeckView;
        this.context = tabsDeckView.getContext();
        this.inflater = LayoutInflater.from(context);
        this.tabDefaultIcon = BuildConfig.IS_LUMEN ?
                ContextCompat.getDrawable(context, R.drawable.lumen_logo_start_tab) :
                ContextCompat.getDrawable(context, R.drawable.ic_cliqz_tab);
        this.defaultFavicon = BitmapFactory
                .decodeResource(context.getResources(), R.drawable.ic_webpage);
        this.defaultBackgroundColor = BuildConfig.IS_LUMEN ?
                ContextCompat.getColor(context, R.color.secondary_color) :
                ContextCompat.getColor(context, R.color.accent_color);
    }

    @NotNull
    @Override
    public ViewHolder onCreateViewHolder(@NotNull ViewGroup parent, int viewType) {
        final View card;
        if (viewType == INCOGNITO_TYPE) {
            card = inflater.inflate(R.layout.deckview_tab_layout, parent, false);
            card.setId(R.id.incognito_tab_id);
        } else {
            card = inflater.inflate(R.layout.deckview_tab_layout, parent, false);
            card.setId(R.id.regular_tab_id);
        }
        return new ViewHolder(tabsDeckView, card);
    }

    @Override
    public void onBindViewHolder(@NotNull ViewHolder holder, int position) {
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
        if (BuildConfig.IS_NOT_LUMEN) {
            final int textColor = entry.isIncognito() ? R.color.normal_tab_primary_color :
                    R.color.incognito_tab_primary_color;
            holder.rootView.setBackground(ContextCompat.getDrawable(context,
                    entry.isIncognito() ? R.drawable.tab_background_dark : R.drawable.tab_background));
            holder.titleTv.setTextColor(ContextCompat.getColor(context, textColor));
        }
        holder.urlTv.setText(url);
        holder.titleTv.setText(title);

        if (mode != Mode.WEBPAGE || entry.getFavIcon() == null) {
            holder.favIconIV.setImageBitmap(defaultFavicon);
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
