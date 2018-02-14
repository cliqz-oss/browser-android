package com.cliqz.browser.main;

import android.graphics.Bitmap;

import java.io.Serializable;

/**
 * This class keep the state of the app and help to dispatch it to the extension during init.
 *
 * @author Stefano Pacifici
 */
public class CliqzBrowserState implements Serializable {

    public enum Mode {
        SEARCH,
        WEBPAGE
    }

    private String query = "";
    private String title = "";
    private String url = "";
    private Mode mode = Mode.SEARCH;
    private boolean incognito;
    private Bitmap favicon = null;

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
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

    void setFavIcon(Bitmap favIcon) {
        this.favicon = favIcon;
    }

    public Bitmap getFavIcon() {
        return favicon;
    }

    public CliqzBrowserState() {
    }
}
