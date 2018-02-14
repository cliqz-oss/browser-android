package com.cliqz.browser.main.search;

/**
 * @author Khaled Tantawy
 */
@SuppressWarnings("WeakerAccess")
public class Topnews {

    public final String url;
    public final String title;
    public final String description;
    public final String domain;
    public final String shortTitle;
    public final String media;
    public final String breakingLabel;
    public final boolean breaking;
    public final boolean isLocalNews;
    public final String localLabel;

    Topnews(String url, String title, String description, String domain, String shortTitle,
            String media, boolean breaking, String breakingLabel, boolean isLocalNews, String localLabel) {
        this.url = url;
        this.title = title;
        this.description = description;
        this.domain = domain;
        this.shortTitle = shortTitle;
        this.media = media;
        this.breaking = breaking;
        this.breakingLabel = breakingLabel;
        this.isLocalNews = isLocalNews;
        this.localLabel = localLabel;
    }
}
