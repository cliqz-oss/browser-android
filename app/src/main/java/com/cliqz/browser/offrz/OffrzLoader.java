package com.cliqz.browser.offrz;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.loader.content.AsyncTaskLoader;

import com.cliqz.utils.FileUtils;
import com.cliqz.utils.StreamUtils;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;

import timber.log.Timber;

/**
 * Load and cache the offrz json
 *
 * @author Stefano Pacifici
 * @author Moaz Rashad
 */
public class OffrzLoader extends AsyncTaskLoader<JSONObject> {

    public static final long SIX_HOURS_IN_S = 21600L;
    private static final String MYOFFRZ_CACHE_FILE = "MyOffrzCache.json";
    public static final String VALIDITY_KEY = "validity";
    private static final String MYOFFRZ_URL = "https://offers-api.cliqz.com/api/v1" +
            "/loadsubtriggers?parent_id=mobile-root&t_eng_ver=1";

    private static final String DOWNLOAD_DATE = "browserDownloadDate";

    private JSONObject mOffrz = null;

    public OffrzLoader(@NonNull Context context) {
        super(context);
    }

    // Indirection for testing
    String getEndpoint() {
        return  MYOFFRZ_URL;
    }

    // Indirection for testing
    File getCacheFile() {
        return new File(getContext().getCacheDir(), MYOFFRZ_CACHE_FILE);
    }

    public JSONObject getCachedOffrz(File cachedOffrzFile){
        try {
            final String jsonString = FileUtils.readTextFromFile(cachedOffrzFile);
            final JSONObject firstOffrz = new JSONObject(jsonString);
            if (!expired(firstOffrz)) {
                return firstOffrz;
            }
            // force deletion the file if expired
            throw new JSONException("Force deletion");
        } catch (FileNotFoundException e) {
            // Nothing to do here, we can not have the file
        } catch (JSONException e) {
            // Delete the file if it is not valid
            if (!cachedOffrzFile.delete()) {
                Timber.w("Can't delete cached offrz file");
            }
        } catch (IOException e) {
            Timber.e("Can't open offrz cache");
        }
        return null;
    }

    @Override
    public JSONObject loadInBackground() {
        // There was an error loading the cache or the offer expired
        final File cachedOffrzFile = getCacheFile();
        final JSONObject cachedOffrz = getCachedOffrz(cachedOffrzFile);
        if(cachedOffrz != null){
            return cachedOffrz;
        }

        JSONObject firstOffrz;
        try {
            final URL url = new URL(getEndpoint());
            final HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            final String response = StreamUtils.readTextStream(connection.getInputStream());
            connection.disconnect();
            final JSONArray offrz = new JSONArray(response);
            firstOffrz = offrz.getJSONObject(0);
            // Add download date here, otherwise the offer will be expired even if it is freshly
            // downloaded, check expired(...) logic.
            final long now = System.currentTimeMillis() / 1000L; // in seconds
            firstOffrz.put(DOWNLOAD_DATE, now);
            if (expired(firstOffrz)) {
                // Even the downloaded offer is expired
                return null;
            }
            // Add download date
        } catch (MalformedURLException e) {
            Timber.e("Malformed hardcoded url%s", getEndpoint());
            return null;
        } catch (IOException e) {
            Timber.e(e,"Can't open connection to %s", getEndpoint());
            return null;
        } catch (JSONException e) {
            Timber.e("Can't parse json response");
            return null;
        } catch (Exception e) {
            // This blog prevents generic crashes
            Timber.e(e,"Generic failure");
            return null;
        }
        try {
            FileUtils.writeTextToFile(cachedOffrzFile, firstOffrz.toString());
        } catch (IOException e) {
            Timber.e("Can't cache data to %s", MYOFFRZ_CACHE_FILE);
        }
        return firstOffrz;
    }

    @Override
    public void deliverResult(JSONObject data) {
        mOffrz = data;
        super.deliverResult(mOffrz);
    }

    @Override
    protected void onStartLoading() {
        if (mOffrz != null && !expired(mOffrz)) {
            super.deliverResult(mOffrz);
        } else {
            forceLoad();
        }
    }

    private static boolean expired(JSONObject offer) {
        final long now = System.currentTimeMillis() / 1000L; // seconds
        try {
            final JSONArray validityRange = offer.getJSONArray(VALIDITY_KEY);
            final long start = validityRange.getLong(0); // in seconds
            final long end = validityRange.getLong(1); // in seconds
            // Using `now - SIX_HOURS_IS_S - 1` as default in the following line ensures we
            // download a new file if there were no DOWNLOAD_DATE in the cached one
            final long downloadDate = offer.optLong(DOWNLOAD_DATE, now - SIX_HOURS_IN_S -1);
            return now < start || now > end || now > (downloadDate + SIX_HOURS_IN_S);
        } catch (JSONException e) {
            return true;
        }
    }
}
