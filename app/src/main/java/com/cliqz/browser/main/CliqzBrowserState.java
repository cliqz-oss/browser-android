package com.cliqz.browser.main;

import java.io.Serializable;

/**
 * This class keep the state of the app and help to dispatch it to the extension during init.
 *
 * @author Stefano Pacifici
 * @date 2015/12/21
 */
public class CliqzBrowserState implements Serializable {

    public enum Mode {
        SEARCH,
        WEBPAGE
    }

    private long timestamp = System.currentTimeMillis();
    private String query = "";
    private int cardIndex = -1;
    private float latitude = Float.MAX_VALUE;
    private float longitude = Float.MAX_VALUE;
    private String title = "";
    private String url = "";
    private Mode mode = Mode.SEARCH;
    private boolean incognito;

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public int getCardIndex() {
        return cardIndex;
    }

    public void setCardIndex(int cardIndex) {
        this.cardIndex = cardIndex;
    }

    public float getLatitude() {
        return latitude;
    }

    public void setLatitude(float latitude) {
        this.latitude = latitude;
    }

    public float getLongitude() {
        return longitude;
    }

    public void setLongitude(float longitude) {
        this.longitude = longitude;
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
        this.timestamp = System.currentTimeMillis();
    }

    public boolean isIncognito() {
        return incognito;
    }

    public void setIncognito(boolean incognito) {
        this.incognito = incognito;
    }

    public CliqzBrowserState() {
    }

//    public final void copyFrom(CliqzBrowserState state) {
//        this.timestamp = state.timestamp;
//        this.query = state.query;
//        this.cardIndex = state.cardIndex;
//        this.latitude = state.latitude;
//        this.longitude = state.longitude;
//        this.title = state.title;
//        this.url = state.url;
//        this.mode = state.mode;
//    }
}
