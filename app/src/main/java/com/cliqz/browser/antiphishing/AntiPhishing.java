package com.cliqz.browser.antiphishing;

import androidx.annotation.VisibleForTesting;
import android.util.Log;

import com.cliqz.utils.StringUtils;

import java.io.InputStreamReader;
import java.io.Reader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

import acr.browser.lightning.utils.UrlUtils;

/**
 * Anti-phishing module. Should be used as a singleton.
 *
 * @author Stefano Pacifici
 */
public class AntiPhishing {

    private static final String TAG = AntiPhishing.class.getSimpleName();
    private static final String DEFAULT_ENDPOINT = "https://antiphishing.cliqz.com/api/bwlist";

    public interface AntiPhishingCallback {
        void onUrlProcessed(String url, boolean isPhishing);
    }

    private final Cache cache;
    private final String endpoint;

    public AntiPhishing() {
        this(new Cache());
    }

    @VisibleForTesting
    AntiPhishing(Cache cache) {
        this(cache, DEFAULT_ENDPOINT);
    }

    @VisibleForTesting
    AntiPhishing(Cache cache, String endpoint) {
        this.cache = cache;
        this.endpoint = endpoint;
    }

    /**
     * It processes the given url to check against our anti-phishing filter.
     * @param url the url the user wants to check
     * @param callback an {@link AntiPhishingCallback} instance that will be called as soon as we
     *                 know if the if the url is for phishing or not. <b>The callback can be called
     *                 on a different thread than the original one.</b>
     */
    public void processUrl(String url, AntiPhishingCallback callback) {
        if (callback == null) { return; }
        final String host = UrlUtils.getDomain(url);
        if (host.isEmpty()) {
            Log.w(TAG, "processUrl called whit empty or null string");
            callback.onUrlProcessed("", false);
        }
        try {
            final String md5Hash = StringUtils.calculateMD5(host);
            final Cache.Result result = cache.check(md5Hash);
            switch (result) {
                case BLACKLIST:
                    callback.onUrlProcessed(url, true);
                    break;
                case FAULT:
                    fetchHash(url, md5Hash, callback);
                    break;
                default:
                    callback.onUrlProcessed(url, false);
            }
        } catch (StringUtils.MD5Exception e) {
            Log.e(TAG, e.getMessage(), e.getCause());
            callback.onUrlProcessed(url, false);
        }
    }

    private void fetchHash(final String url, final String md5Hash, final AntiPhishingCallback callback) {
        final Runnable fetcher = new Runnable() {
            @Override
            public void run() {
                final String md5prefix = AntiPhishingUtils.splitMD5(md5Hash)[0];
                final String formattedUrl = String.format(Locale.US, "%s?md5=%s", endpoint, md5prefix);
                HttpURLConnection connection = null;
                try {
                    final URL curl = new URL(formattedUrl);
                    connection = (HttpURLConnection) curl.openConnection();
                    final Reader reader = new InputStreamReader(connection.getInputStream());
                    final CacheEntry response = CacheEntry.from(reader);
                    cache.addToCache(md5prefix, response);
                    processUrl(url, callback);
                    reader.close();
                } catch (Exception e) {
                    // Keep as plain java as possible
                    e.printStackTrace();
                    callback.onUrlProcessed(url, false);
                } finally {
                    if (connection != null) {
                        connection.disconnect();
                    }
                }
            }
        };
        new Thread(fetcher).start();
    }
}
