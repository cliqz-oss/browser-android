package com.cliqz.browser.antiphishing;

import java.util.ArrayList;

/**
 * Used with Gson to parse the server response, it is also the entry class of the {@link Cache}.
 *
 * @author Stefano Pacifici
 * @date 2016/07/11
 */
class CacheEntry {
    ArrayList<ArrayList<String>> blacklist;
    ArrayList<ArrayList<String>> whitelist;

    static CacheEntry newEmptyCacheEntry() {
        final CacheEntry entry = new CacheEntry();
        entry.blacklist = new ArrayList<>();
        entry.whitelist = new ArrayList<>();
        return entry;
    }
}
