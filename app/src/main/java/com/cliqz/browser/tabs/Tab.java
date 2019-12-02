package com.cliqz.browser.tabs;

import android.graphics.Bitmap;
import android.os.Message;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.main.TabFragment2;

import java.io.Serializable;

import acr.browser.lightning.view.CliqzWebView;

/**
 * The tab model, it keeps all the information regarding the tab tab
 *
 * @author Stefano Pacifici
 */
public abstract class Tab {

    public enum Mode {
        SEARCH,
        WEBPAGE
    }

    public final String id;
    public final String parentId;

    private String query = "";
    private String title = "";
    private String url = "";
    private Mode mode = Mode.SEARCH;
    private boolean incognito;
    private Bitmap favicon = null;

    @NonNull
    public String getQuery() {
        return query;
    }

    public void setQuery(@Nullable String query) {
        this.query = query != null ? query : "";
    }

    @NonNull
    public String getTitle() {
        return title;
    }

    public void setTitle(@Nullable String title) {
        this.title = title != null ? title : "";
    }

    @NonNull
    public String getUrl() {
        return url;
    }

    public void setUrl(@NonNull String url) {
        this.url = url;
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

    public boolean isIncognito() {
        return incognito;
    }

    public void setIncognito(boolean incognito) {
        this.incognito = incognito;
    }

    public void setFavIcon(@Nullable Bitmap favIcon) {
        this.favicon = favIcon;
    }

    @Nullable
    public Bitmap getFavIcon() {
        return favicon;
    }

    @Nullable
    public abstract Message fetchMessage();

    public abstract boolean hasToLoad();

    protected Tab(  @NonNull String id,
                    @Nullable String parentId) {
        this.id = id;
        this.parentId = parentId;
    }
}
