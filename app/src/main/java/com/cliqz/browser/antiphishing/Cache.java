package com.cliqz.browser.antiphishing;

import android.support.annotation.VisibleForTesting;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

/**
 * Simple cache for the anti-phishing module, it does not implement any form of persistence
 *
 * @author Stefano Pacifici
 * @date 2016/07/11
 */
class Cache {

    enum Result {
        BLACKLIST, // We have a cached entry and the url is in the black list
        WHITELIST, // We have a cached entry and the url is in the white list
        UNKNOWN, // We have a cached entry but the url doesn't appear in the black or in the white list
        FAULT // We do not have a cached entry
    }

    private static final String TAG = Cache.class.getSimpleName();

    private final Map<String, CacheEntry> mCache = new HashMap<>();

    @VisibleForTesting
    void addToBlacklist(String md5) {
        if (!AntiPhishingUtils.checkMD5(md5)) { return; }
        final String[] md5parts = AntiPhishingUtils.splitMD5(md5);
        final CacheEntry entry = getOrCreateCacheEntry(md5parts[0]);
        addToList(entry.blacklist, md5parts[1]);
    }

    @VisibleForTesting
    void addToWhitelist(String md5) {
        if (!AntiPhishingUtils.checkMD5(md5)) { return; }
        final String[] md5parts = AntiPhishingUtils.splitMD5(md5);
        final CacheEntry entry = getOrCreateCacheEntry(md5parts[0]);
        addToList(entry.whitelist, md5parts[1]);
    }

    private void addToList(ArrayList<ArrayList<String>> list, String md5suffix) {
        final ArrayList<String> entry = new ArrayList<>();
        entry.add(md5suffix);
        list.add(entry);
    }

    public Result check(String md5) {
        if (!AntiPhishingUtils.checkMD5(md5)) { return Result.UNKNOWN; }
        final String[] md5parts = AntiPhishingUtils.splitMD5(md5);
        final CacheEntry entry = mCache.get(md5parts[0]);
        if (entry == null) {
            return Result.FAULT;
        } else if (checkIfListContains(entry.blacklist, md5parts[1])) {
            return checkIfListContains(entry.whitelist, md5parts[1]) ?
                    Result.WHITELIST : Result.BLACKLIST;
        } else {
            return checkIfListContains(entry.whitelist, md5parts[1]) ?
                    Result.WHITELIST : Result.UNKNOWN;
        }
    }

    private boolean checkIfListContains(ArrayList<ArrayList<String>> list, String md5Suffix) {
        for (ArrayList<String> entry: list) {
            if (entry.contains(md5Suffix)) {
                return true;
            }
        }
        return false;
    }

    private CacheEntry getOrCreateCacheEntry(String md5prefix) {
        CacheEntry result = mCache.get(md5prefix);
        if (result == null) {
            result = CacheEntry.newEmptyCacheEntry();
            mCache.put(md5prefix, result);
        }
        return result;
    }

    void addToCache(String md5prefix, CacheEntry response) {
        synchronized (mCache) {
            mCache.put(md5prefix, response);
        }
    }

}
