package acr.browser.lightning.utils;

import android.content.Context;
import android.content.res.AssetManager;
import android.net.Uri;
import android.util.Log;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

public class AdBlock {

    private static final String TAG = "AdBlock";
    private static final String BLOCKED_DOMAINS_LIST_FILE_NAME = "adhosts.txt";
    private final Set<String> mBlockedDomainsList = new HashSet<>();
    private static final Locale mLocale = Locale.getDefault();

    public AdBlock(Context context) {
        loadHostsFile(context);
    }

    /**
     * a method that determines if the given URL is an ad or not. It performs
     * a search of the URL's domain on the blocked domain hash set.
     * @param uri the URL to check for being an ad
     * @return true if it is an ad, false if it is not an ad
     */
    public boolean isAd(Uri uri) {
        if (uri == null || mBlockedDomainsList == null) {
            return false;
        }

        final String host = uri.getHost();
        if (host != null) {
            final String domain = host.startsWith("www.") ? host.substring(4) : host;

            boolean isOnBlacklist = mBlockedDomainsList.contains(domain.toLowerCase(mLocale));
            if (isOnBlacklist) {
                Log.d(TAG, "URL '" + uri.toString() + "' is an ad");
            }
            return isOnBlacklist;
        } else {
            return false;
        }
    }

    /**
     * This method reads through a hosts list file of domains that should be redirected to localhost
     * (a.k.a. IP address 127.0.0.1). The file must be the one generated via adhosts.gralde script.
     * @param context the context needed to read the file
     */
    private void loadHostsFile(final Context context) {
        new Thread(new Runnable() {

            @Override
            public void run() {
                AssetManager asset = context.getAssets();
                BufferedReader reader = null;
                try {
                    reader = new BufferedReader(new InputStreamReader(
                            asset.open(BLOCKED_DOMAINS_LIST_FILE_NAME)));
                    String line;
                    int i = 0;
                    while ((line = reader.readLine()) != null) {
                        mBlockedDomainsList.add(line.trim());
                        i++;
                    }
                } catch (IOException e) {
                    Log.wtf(TAG, "Reading blocked domains list from file '"
                            + BLOCKED_DOMAINS_LIST_FILE_NAME + "' failed.", e);
                } finally {
                    Utils.close(reader);
                }
            }
        }).start();
    }
}
