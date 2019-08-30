package com.cliqz.browser.main.search;

import android.os.AsyncTask;

import androidx.annotation.Nullable;

import com.cliqz.browser.utils.HttpHandler;
import com.cliqz.browser.utils.LocationCache;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import acr.browser.lightning.preference.PreferenceManager;
import timber.log.Timber;

/**
 * @author Ravjit Uppal
 */
public class NewsFetcher extends AsyncTask<URL, Void, JSONObject> {

    public interface OnTaskCompleted{
        void onTaskCompleted(List<Topnews> topnewses, int breakingNewsCount, int localNewsCount,
                             String newsVersion);
    }

    private static final String TAG = NewsFetcher.class.getSimpleName();
    private static final String CONTENT_TYPE_JSON = "application/json";
    private static final String NEWS_PAYLOAD = "{\"q\":\"\",\"results\":[{\"url\":\"rotated-top-news.cliqz.com\",\"snippet\":{}}]}";
    private static final String NEWS_URL = "https://api.cliqz.com/api/v2/rich-header?path=/v2/map";

    private final OnTaskCompleted listener;

    NewsFetcher(OnTaskCompleted listener) {
        this.listener = listener;
    }

    @Override
    protected JSONObject doInBackground(URL... params) {
        return HttpHandler.sendRequest("PUT", params[0], CONTENT_TYPE_JSON, null, NEWS_PAYLOAD);
    }

    protected void onPostExecute(@Nullable JSONObject result) {
        if (result == null) {
            return;
        }
        final List<Topnews> topnews = new ArrayList<>(5);
        int breakingNewsCount = 0;
        int localNewsCount = 0;
        try {
            JSONObject data = result.getJSONArray("results").getJSONObject(0).getJSONObject("snippet").getJSONObject("extra");
            final JSONArray articles = data.getJSONArray("articles");
            final String newsVersion = data.getString("news_version");
            for (int i = 0; i < articles.length(); i++) {
                try {
                    final JSONObject article = articles.getJSONObject(i);

                    final String url = article.optString("url", "");
                    final String title = article.optString("title", "");
                    final String description = article.optString("description", "");
                    final String domain = article.optString("domain", "");
                    final String shortTitle = article.optString("short_title", "");
                    final String media = article.optString("media", "");
                    final boolean breaking = article.optBoolean("breaking", false);
                    final String breakingLabel = article.optString("breaking_label", "");
                    if (breaking) {
                        breakingNewsCount++;
                    }
                    final boolean isLocalNews = article.has("local_news");
                    if (isLocalNews) {
                        localNewsCount++;
                    }
                    final String localLabel = article.optString("local_label", "");
                    topnews.add(new Topnews(url, title, description, domain, shortTitle, media,
                            breaking, breakingLabel, isLocalNews, localLabel));
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            listener.onTaskCompleted(topnews, breakingNewsCount, localNewsCount, newsVersion);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Nullable
    static URL getTopNewsUrl(PreferenceManager preferenceManager,
                             @SuppressWarnings("SameParameterValue") int newsCount,
                             LocationCache locationCache) {
        String locale = Locale.getDefault().toString().replace("_", "-");
        final String[] parts = locale.split("-");
        String lang = null;
        String country;
        String newsEdition = "intl";
        if (parts.length > 0) {
            lang = parts[0].toLowerCase();
        }
        country = preferenceManager.getCountryChoice().countryCode;
        final StringBuilder sb = new StringBuilder(NEWS_URL);
        sb.append("&locale=").append(locale);
        if (lang != null) {
            sb.append("&lang=").append(lang);
            if (lang.equals(Locale.GERMAN.getLanguage()) || lang.equals(Locale.FRENCH.getLanguage())) {
                newsEdition = lang;
            }
        }
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
            Timber.e("Error fetching request%s", NEWS_URL);
            return null;
        }
    }

}
