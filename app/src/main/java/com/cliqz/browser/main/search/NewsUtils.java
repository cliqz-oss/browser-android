package com.cliqz.browser.main.search;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.utils.LocationCache;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import timber.log.Timber;

public final class NewsUtils {
    private static final String NEWS_URL = "https://api.cliqz.com/api/v2/rich-header?path=/v2/map";
    private static final String DEFAULT_EDITION = "intl";
    private static final Pattern LOCALE_PARSE_REGEX =
            Pattern.compile("^([a-z]+([_-][a-z]+)*)[_-]([a-z]+)$", Pattern.CASE_INSENSITIVE);
    private static final Set<String> SUPPORTED_EDITIONS = new HashSet<>(Arrays.asList(
            "de", "fr", "us", "gb", "es", "it"
    ));

    @Nullable
    static URL getTopNewsUrl(@SuppressWarnings("SameParameterValue") int newsCount,
                             LocationCache locationCache) {
        final String locale = Locale.getDefault().toString();
        final Matcher matcher = LOCALE_PARSE_REGEX.matcher(locale);
        final String lang = matcher.matches() ? matcher.group(1) : null;
        final String country = matcher.matches() ? matcher.group(3) : null;
        final StringBuilder sb = new StringBuilder(NEWS_URL);
        final String newsEdition = getEdition(lang, country);
        sb.append("&locale=").append(locale);
        sb.append("&edition=").append(newsEdition);
        if (country != null) {
            sb.append("&country=").append(country);
        }
        sb.append("&count=").append(newsCount);
        sb.append("&platform=1");
        if (locationCache.getLastLocation() != null) {
            sb.append("&loc=").append(locationCache.getLastLocation().getLatitude()).append(",")
                    .append(locationCache.getLastLocation().getLongitude());
        }
        try {
            return new URL(sb.toString());
        } catch (MalformedURLException e) {
            Timber.e(e,"Malformed news url: %s", NEWS_URL);
            return null;
        }
    }

    @NonNull
    public static String getEdition() {
        final String locale = Locale.getDefault().toString();
        final Matcher matcher = LOCALE_PARSE_REGEX.matcher(locale);
        final String lang = matcher.matches() ? matcher.group(1) : null;
        final String country = matcher.matches() ? matcher.group(3) : null;
        return getEdition(lang, country);
    }

    @NonNull
    static String getEdition(@Nullable String lang, @Nullable String country) {
        final String lowerCountry = country != null ? country.toLowerCase() : null;
        if (lowerCountry != null && SUPPORTED_EDITIONS.contains(lowerCountry)) {
            return lowerCountry;
        }
        final String lowerLang = lang != null ? lang.toLowerCase() : null;
        if (lowerLang != null && SUPPORTED_EDITIONS.contains(lowerLang)) {
            return lowerLang;
        }
        return DEFAULT_EDITION;
    }
}
