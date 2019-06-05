package com.cliqz.browser.webview;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

/**
 * This class catches basic informations about a "topsite"
 *
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class Topsite {

    /**
     * The urls database id (primary key)
     */
    public final long id;

    /**
     * The url of the topsite (web page)
     */
    @NonNull
    public final String url;

    /**
     * The title of the topsite (web page title)
     */
    @Nullable
    public final String title;

    /**
     * The topsite domain extracted from the url
     */
    @NonNull
    public final String domain;

    /**
     *
     * @param id the urls database id for this topsite
     * @param url the topsite url
     * @param domain the pre-extracted domain (from url)
     * @param title the title of the page
     */
    public Topsite(long id, @NonNull String url, @NonNull String domain, @Nullable String title) {
        this.id = id;
        this.url = url;
        this.title = title;
        this.domain = domain;
    }

}
