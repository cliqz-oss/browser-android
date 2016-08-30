/*
 * Copyright (C) 2010 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package acr.browser.lightning.utils;

import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Patterns;
import android.webkit.URLUtil;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility methods for Url manipulation
 */
public class UrlUtils {
    private static final Pattern ACCEPTED_URI_SCHEMA = Pattern.compile(
            "(?i)" + // switch on case insensitive matching
                    '(' +    // begin group for schema
                    "(?:http|https|file)://" +
                    "|(?:inline|data|about|javascript):" +
                    "|(?:.*:.*@)" +
                    ')' +
                    "(.*)");
    // Google search
    public final static String QUERY_PLACE_HOLDER = "%s";
    // Regular expression to strip http:// and optionally
    // the trailing slash
    private static final Pattern STRIP_URL_PATTERN =
            Pattern.compile("^http://(.*?)/?$");

    // Regular expression to recognize youtube video page
    private static final Pattern YOUTUBE_VIDEO_URL_PATTERN =
            Pattern.compile("https?://(m\\.|www\\.)?youtube.+/watch\\?v=.*");

    private final static Set<String> HOST_PREFIXES = new HashSet<>(Arrays.asList(new String[] {
            "www", "m"
    }));

    private UrlUtils() { /* cannot be instantiated */ }

    /**
     * Strips the provided url of preceding "http://" and any trailing "/". Does not
     * strip "https://". If the provided string cannot be stripped, the original string
     * is returned.
     * <p/>
     * TODO: Put this in TextUtils to be used by other packages doing something similar.
     *
     * @param url a url to strip, like "http://www.google.com/"
     * @return a stripped url like "www.google.com", or the original string if it could
     * not be stripped
     */
    public static String stripUrl(String url) {
        if (url == null) return null;
        Matcher m = STRIP_URL_PATTERN.matcher(url);
        if (m.matches()) {
            return m.group(1);
        } else {
            return url;
        }
    }

    /**
     * Attempts to determine whether user input is a URL or search
     * terms.  Anything with a space is passed to search if canBeSearch is true.
     * <p/>
     * Converts to lowercase any mistakenly uppercased schema (i.e.,
     * "Http://" converts to "http://"
     *
     * @param canBeSearch If true, will return a search url if it isn't a valid
     *                    URL. If false, invalid URLs will return null
     * @return Original or modified URL
     */
    public static String smartUrlFilter(String url, boolean canBeSearch, String searchUrl) {
        String inUrl = url.trim();
        boolean hasSpace = inUrl.indexOf(' ') != -1;
        Matcher matcher = ACCEPTED_URI_SCHEMA.matcher(inUrl);
        if (matcher.matches()) {
            // force scheme to lowercase
            String scheme = matcher.group(1);
            String lcScheme = scheme.toLowerCase();
            if (!lcScheme.equals(scheme)) {
                inUrl = lcScheme + matcher.group(2);
            }
            if (hasSpace && Patterns.WEB_URL.matcher(inUrl).matches()) {
                inUrl = inUrl.replace(" ", "%20");
            }
            return inUrl;
        }
        if (!hasSpace) {
            if (Patterns.WEB_URL.matcher(inUrl).matches()) {
                return URLUtil.guessUrl(inUrl);
            }
        }
        if (canBeSearch) {
            return URLUtil.composeSearchUrl(inUrl,
                    searchUrl, QUERY_PLACE_HOLDER);
        }
        return null;
    }

    public static @NonNull String getDomain(@Nullable String url) {
        if (url == null) {
            return "";
        }
        try {
            final URL purl = new URL(url);
            final String host = purl.getHost();
            return (host == null || host.isEmpty()) ? "" : host;
        } catch (MalformedURLException e) {
            // Keep it pure java as possible
            e.printStackTrace();
            return "";
        }
    }

    /**
     * Try to determine the top level domain, removing www, m and other known prefixes.
     *
     * @param url The url from which we should extract the top domain
     * @return a domain or an empty string
     */
    public static @NonNull String getTopDomain(@Nullable String url) {
        final String host = getDomain(url);
        final LinkedList<String> parts = new LinkedList<>(Arrays.asList(host.split("\\.")));
        while (parts.size() > 0 && HOST_PREFIXES.contains(parts.get(0))) {
            parts.remove(0);
        }
        final StringBuilder builder = new StringBuilder();
        String divider = "";
        for (String part: parts) {
            builder.append(divider)
                .append(part);
            divider=".";
        }
        return builder.toString();
    }

    public static boolean isYoutubeVideo(@Nullable String url) {
        if (url == null) {
            return false;
        }

        final Matcher matcher = YOUTUBE_VIDEO_URL_PATTERN.matcher(url);
        return matcher.matches();
    }
}