package com.cliqz.browser.main;

/**
 * @author Ravjit Uppal
 */
public class FavoriteModel {

    private String url;
    private String title;

    public FavoriteModel(String url, String title) {
        this.url = url;
        this.title = title;
    }

    public String getUrl() {
        return url;
    }

    public String getTitle() {
        return title;
    }
}