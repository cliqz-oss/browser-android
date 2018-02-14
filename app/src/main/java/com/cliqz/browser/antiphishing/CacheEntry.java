package com.cliqz.browser.antiphishing;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;

/**
 * Used to parse the antiphishing server response, it is also the entry class of the {@link Cache}.
 *
 * @author Stefano Pacifici
 */
class CacheEntry {
    final ArrayList<String> blacklist = new ArrayList<>();
    final ArrayList<String> whitelist = new ArrayList<>();

    private CacheEntry() {}

    static CacheEntry newEmptyCacheEntry() {
        return new CacheEntry();
    }

    public static CacheEntry from(Reader reader) throws IOException, JSONException {
        final StringBuilder stringBuffer = new StringBuilder();
        final CacheEntry result = new CacheEntry();
        final char[] buffer = new char[1024];
        int read;

        while ((read = reader.read(buffer)) > 0) {
            stringBuffer.append(buffer, 0, read);
        }

        final JSONObject jsonObject = new JSONObject(stringBuffer.toString());
        final JSONArray whitelist = jsonObject.optJSONArray("whitelist");
        final JSONArray blacklist = jsonObject.optJSONArray("blacklist");

        addEntriesFrom(blacklist, result.blacklist);
        addEntriesFrom(whitelist, result.whitelist);
        return result;
    }

    private static void addEntriesFrom(JSONArray jsonList, ArrayList<String> list) {
        if (jsonList == null) {
            return;
        }

        final int listSize = jsonList.length();
        for (int i = 0; i < listSize; i++) {
            final JSONArray innerList = jsonList.optJSONArray(0);
            final String value = jsonList.optString(0);
            if (innerList != null) {
                final String innerValue = innerList.optString(0);
                if (innerValue != null && innerValue.length() > 0) {
                    list.add(innerValue);
                }
            } else if (value != null && value.length() > 0) {
                list.add(value);
            }
        }
    }
}
