package com.cliqz.browser.main;

/**
 * @author Ravjit Uppal
 */
class HistoryModel {

    private long id;
    private String url;
    private String title;
    private String time;
    private int type;

    HistoryModel(long id, String url, String title, String time, int type) {
        this.id = id;
        this.url = url;
        this.title = title;
        this.time = time;
        this.type = type;
    }

    public long getId() {
        return id;
    }

    public String getUrl() {
        return url;
    }

    public String getTitle() {
        return title;
    }

    public String getTime() {
        return time;
    }

    public int getType() {
        return type;
    }

}