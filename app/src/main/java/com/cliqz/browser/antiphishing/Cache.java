package com.cliqz.browser.antiphishing;

import android.support.annotation.VisibleForTesting;

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
        entry.blacklist.add(md5parts[1]);
    }

    @VisibleForTesting
    void addToWhitelist(String md5) {
        if (!AntiPhishingUtils.checkMD5(md5)) { return; }
        final String[] md5parts = AntiPhishingUtils.splitMD5(md5);
        final CacheEntry entry = getOrCreateCacheEntry(md5parts[0]);
        entry.whitelist.add(md5parts[1]);
    }

    public Result check(String md5) {
        if (!AntiPhishingUtils.checkMD5(md5)) { return Result.UNKNOWN; }
        final String[] md5parts = AntiPhishingUtils.splitMD5(md5);
        final CacheEntry entry = mCache.get(md5parts[0]);
        if (entry == null) {
            return Result.FAULT;
        } else if (entry.blacklist.contains(md5parts[1])) {
            return entry.whitelist.contains(md5parts[1]) ? Result.WHITELIST : Result.BLACKLIST;
        } else {
            return entry.whitelist.contains(md5parts[1]) ? Result.WHITELIST : Result.UNKNOWN;
        }
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
