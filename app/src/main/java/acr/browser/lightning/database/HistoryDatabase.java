/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.database;

import android.content.ContentValues;
import android.content.Context;
import android.content.res.Resources;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.R;
import com.cliqz.browser.webview.Topsite;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URI;
import java.util.ArrayList;
import java.util.Locale;

import timber.log.Timber;

public class HistoryDatabase extends SQLiteOpenHelper {

    // All Static variables
    // Database Version
    private static final int DATABASE_VERSION = 7;

    // Database Name
    private static final String DATABASE_NAME = "historyManager";

    // HistoryItems table name
    private static final class UrlsTable {

        private UrlsTable() {}

        static final String TABLE_NAME = "urls";

        // Columns
        static final String ID = "id";
        static final String URL = "url";
        static final String DOMAIN = "domain"; // Added in v6
        static final String TITLE = "title";
        static final String VISITS = "visits";
        static final String TIME = "time";
        static final String FAVORITE = "favorite";
        static final String FAV_TIME = "fav_time";
    }

    private static final class HistoryTable {
        private HistoryTable() {}

        static final String TABLE_NAME = "history";

        //Columns
        static final String ID = "id";
        static final String URL_ID = "url_id";
        static final String TIME = "time";
    }

    private static final class BlockedTopSitesTable {
        private BlockedTopSitesTable() {}

        static final String TABLE_NAME = "blocked_topsites";

        // Columns
        static final String DOMAIN = "domain";
    }

    private static final class QueriesTable {
        private QueriesTable() {}

        static final String TABLE_NAME = "queries";
        //Columns
        static final String ID = "id";
        static final String QUERY = "query";
        static final String TIME = "time";
    }

    public static final class HistoryKeys {
        private HistoryKeys() {}

        // Fields
        public static final String HISTORY_ID = "id";
        public static final String URL = "url";
        public static final String TITLE = "title";
        public static final String TIME = "timestamp";
    }

    private final Resources res;
    private final DatabaseHandler dbHandler;

    public HistoryDatabase(Context context) {
        super(context.getApplicationContext(), DATABASE_NAME, null, DATABASE_VERSION);
        this.res = context.getResources();
        this.dbHandler = new DatabaseHandler(this);
    }

    // Creating Tables
    @Override
    public void onCreate(SQLiteDatabase db) {
        db.beginTransaction();
        try {
            createV7DB(db);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    private void createV4DB(SQLiteDatabase db) {
        db.execSQL(res.getString(R.string.create_urls_table_v4));
        db.execSQL(res.getString(R.string.create_history_table_v4));
        db.execSQL(res.getString(R.string.create_urls_index_v4));
        db.execSQL(res.getString(R.string.create_visits_index_v4));
    }

    // We keep this method to keep track of the differences between v5 and v6
    @SuppressWarnings("unused")
    private void createV5DB(SQLiteDatabase db) {
        db.execSQL(res.getString(R.string.create_urls_table_v5));
        db.execSQL(res.getString(R.string.create_history_table_v5));
        db.execSQL(res.getString(R.string.create_urls_index_v5));
        db.execSQL(res.getString(R.string.create_visits_index_v5));
    }

    private void createV6DB(SQLiteDatabase db) {
        db.execSQL(res.getString(R.string.create_urls_table_v6));
        db.execSQL(res.getString(R.string.create_history_table_v5));
        db.execSQL(res.getString(R.string.create_urls_index_v5));
        db.execSQL(res.getString(R.string.create_visits_index_v5));
        db.execSQL(res.getString(R.string.create_blocked_topsites_table_v6));
    }

    private void createV7DB(SQLiteDatabase db) {
        db.execSQL(res.getString(R.string.create_urls_table_v6));
        db.execSQL(res.getString(R.string.create_history_table_v5));
        db.execSQL(res.getString(R.string.create_urls_index_v5));
        db.execSQL(res.getString(R.string.create_visits_index_v5));
        db.execSQL(res.getString(R.string.create_blocked_topsites_table_v6));
        db.execSQL(res.getString(R.string.create_queries_table_v7));
    }


    // Upgrading database
    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.beginTransaction();
        try {
            switch (oldVersion) {
                case 2:
                    db.execSQL(res.getString(R.string.alter_history_table_v2_to_v3));
                    db.execSQL(res.getString(R.string.create_visits_index_v3));
                case 3:
                    db.execSQL(res.getString(R.string.rename_history_table_to_tempHistory_v3_to_v4));
                    db.execSQL(res.getString(R.string.drop_urlIndex_v3_to_v4));
                    db.execSQL(res.getString(R.string.drop_countIndex_v3_to_v4));
                    createV4DB(db);
                    db.execSQL(res.getString(R.string.move_to_new_history_v3_to_v4));
                    db.execSQL(res.getString(R.string.move_to_urls_v3_to_v4));
                    db.execSQL(res.getString(R.string.drop_tempHistory_v3_to_v4));
                case 4:
                    db.execSQL(res.getString(R.string.add_column_fav_time_v5));
                    db.execSQL(res.getString(R.string.move_favorites_to_urls_v5));
                case 5:
                    // Add the domain column
                    db.execSQL(res.getString(R.string.add_column_domain_to_urls_v6));
                    // Create the blocked topsites table
                    db.execSQL(res.getString(R.string.create_blocked_topsites_table_v6));
                case 6:
                    //create queries table
                    db.execSQL(res.getString(R.string.create_queries_table_v7));
                    db.setTransactionSuccessful();
                    break;
                default:
                    // Drop older table if it exists
                    db.execSQL("DROP TABLE IF EXISTS " + UrlsTable.TABLE_NAME);
                    db.execSQL("DROP TABLE IF EXISTS " + HistoryTable.TABLE_NAME);
                    db.execSQL("DROP TABLE IF EXISTS " + BlockedTopSitesTable.TABLE_NAME);
                    db.execSQL("DROP TABLE IF EXISTS " + QueriesTable.TABLE_NAME);
                    // Create tables again
                    createV7DB(db);

                    db.setTransactionSuccessful();
                    break;
            }
        } finally {
            db.endTransaction();
        }
    }

    @Override
    public synchronized void close() {
        dbHandler.close();
        super.close();
    }

    /**
     * Update an history and urls
     *
     * @param url   the url to update
     * @param title the title of the page to which the url is pointing
     */
    public synchronized long visitHistoryItem(@NonNull String url, @Nullable String title) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor q = db.query(false, UrlsTable.TABLE_NAME,
                new String[]{UrlsTable.ID, UrlsTable.VISITS},
                UrlsTable.URL + " = ?", new String[]{url}, null, null, null, "1");
        final long time = System.currentTimeMillis();
        final ContentValues urlsValues = new ContentValues();
        final String domain = extractDomainFrom(url);
        urlsValues.put(UrlsTable.URL, url);
        urlsValues.put(UrlsTable.DOMAIN, domain);
        urlsValues.put(UrlsTable.TITLE, title);
        urlsValues.put(UrlsTable.VISITS, 1L);
        urlsValues.put(UrlsTable.TIME, time);
        db.beginTransaction();
        long historyID;
        try {
            final long urlId;
            if (q.getCount() > 0) {
                q.moveToFirst();
                final int idIndex = q.getColumnIndex(UrlsTable.ID);
                final int visitsIndex = q.getColumnIndex(UrlsTable.VISITS);
                urlId = q.getLong(idIndex);
                final long visits = q.getLong(visitsIndex);
                urlsValues.put(UrlsTable.VISITS, visits + 1L);
                db.update(UrlsTable.TABLE_NAME, urlsValues, UrlsTable.ID + " = ?", new String[]{Long.toString(urlId)});
            } else {
                urlId = db.insert(UrlsTable.TABLE_NAME, null, urlsValues);
            }
            q.close();
            final ContentValues historyValues = new ContentValues();
            historyValues.put(HistoryTable.URL_ID, urlId);
            historyValues.put(HistoryTable.TIME, time);
            historyID = db.insert(HistoryTable.TABLE_NAME, null, historyValues);
            db.setTransactionSuccessful();
            return historyID;
        } catch (Exception e) {
            // We do not want to crash if we can't update history
            Timber.e(e, "Error updating history");
        } finally {
            db.endTransaction();
        }
        return -1;
    }

    /**
     * Simply delete all the entries in the blocked_topsites table
     */
    public void restoreTopSites() {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            db.delete(BlockedTopSitesTable.TABLE_NAME, null, null);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    @Nullable
    private static String extractDomainFrom(@NonNull String url) {
        try {
            final URI uri = URI.create(url);
            final String host = uri.getHost();
            final String domain;
            if (host == null) {
                domain = null;
            } else if (host.startsWith("www.")) {
                domain = host.substring(4);
            } else {
                domain = host;
            }
            return domain;
        } catch (IllegalArgumentException e) {
            Timber.e(e, "Illegal url: %s", url);
        }
        return null;
    }

    /**
     * Query the history db to fetch the top most visited websites.
     * @param limit the number of items to return
     * @return a list of {@link Topsite}. The time stamp of these elements is always -1.
     */
    public synchronized ArrayList<Topsite> getTopSites(int limit) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        if (limit < 1) {
            limit = 1;
        } else if (limit > 100) {
            limit = 100;
        }
        final ArrayList<Topsite> topsites = new ArrayList<>(limit);
        Cursor cursor = db.rawQuery(res.getString(R.string.get_top_sites_v6), null);
        int counter = 0;
        if (cursor.moveToFirst()) {
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int domainIndex = cursor.getColumnIndex(UrlsTable.DOMAIN);
            final int idIndex = cursor.getColumnIndex(UrlsTable.ID);
            do {
                final String domain = cursor.getString(domainIndex);
                final long id = cursor.getLong(idIndex);
                final String url = cursor.getString(urlIndex);
                if (domain == null) {
                    final String domainToCheck = extractDomainFrom(url);
                    if (domainToCheck  != null) {
                        patchDomainForUrlWithId(db, id, domainToCheck);
                        if (blockedDomain(db, domainToCheck)) {
                            continue;
                        }
                    }
                }
                topsites.add(new Topsite(id, url, domain != null ? domain : "", cursor.getString(titleIndex)));
                counter++;
            } while (cursor.moveToNext() && counter < limit);
        }
        cursor.close();
        return topsites;
    }

    private static boolean blockedDomain(@NonNull SQLiteDatabase db, @NonNull String domain) {
        final Cursor cursor = db.query(BlockedTopSitesTable.TABLE_NAME, null, "domain = ?", new String[] {domain}, null, null, null);
        final boolean result = cursor.moveToFirst();
        cursor.close();
        return result;
    }

    private static void patchDomainForUrlWithId(@NonNull SQLiteDatabase db, long id, @NonNull String domain) {
        final ContentValues domainValues = new ContentValues();
        domainValues.put(UrlsTable.DOMAIN, domain);
        db.update(UrlsTable.TABLE_NAME, domainValues, UrlsTable.ID + " = ?",
                new String[] { Long.toString(id) });
    }


    @Deprecated
    public synchronized JSONArray findItemsContaining(@Nullable String search, int limit) {
        final JSONArray itemList = new JSONArray();
        if (search == null) {
            return itemList;
        }
        final SQLiteDatabase mDatabase = dbHandler.getDatabase();
        if (limit <= 0) {
            limit = 5;
        }
        final String formattedSearch = String.format("%%%s%%", search);
        final String selectQuery = res.getString(R.string.seach_history_query_v5);
        final Cursor cursor = mDatabase.rawQuery(selectQuery, new String[]{
                formattedSearch,
                formattedSearch,
                Integer.toString(limit)
        });

        int n = 0;
        if (cursor.moveToFirst()) {
            // final int idIndex = cursor.getColumnIndex(UrlsTable.ID);
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            do {
                try {
                    final JSONObject item = new JSONObject();
                    item.put(HistoryKeys.URL, cursor.getString(urlIndex));
                    item.put(HistoryKeys.TITLE, cursor.getString(titleIndex));
                    itemList.put(item);
                    n++;
                } catch (JSONException e) {
                    // Ignore this org.json weirdness
                }
            } while (cursor.moveToNext() && n < limit);
        }
        cursor.close();
        return itemList;
    }


    @NonNull
    public synchronized Bundle[] searchHistory(@Nullable String search, int limit) {
        if (search == null) {
            return new Bundle[0];
        }
        final SQLiteDatabase mDatabase = dbHandler.getDatabase();
        if (limit <= 0) {
            limit = 5;
        }
        final String formattedSearch = String.format("%%%s%%", search);
        final String selectQuery = res.getString(R.string.seach_history_query_v5);
        final Cursor cursor = mDatabase.rawQuery(selectQuery, new String[]{
                formattedSearch,
                formattedSearch,
                Integer.toString(limit)
        });

        final int size = cursor.getCount();
        final Bundle[] result = new Bundle[size];
        final int urlIndex;
        final int titleIndex;
        if (cursor.moveToFirst()) {
            urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
        } else {
            urlIndex = -1;
            titleIndex = -1;
        }
        for (int index = 0; index < size; index++) {
            final Bundle historyRecord = new Bundle();
            historyRecord.putString(HistoryKeys.URL, cursor.getString(urlIndex));
            historyRecord.putString(HistoryKeys.TITLE, cursor.getString(titleIndex));
            result[index] = historyRecord;
            cursor.moveToNext();
        }
        cursor.close();
        return result;
    }

    public synchronized int getHistoryItemsCount() {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final String countQuery = "SELECT COUNT(*) FROM " + HistoryTable.TABLE_NAME;
        final Cursor cursor = db.rawQuery(countQuery, null);
        final int result = cursor.moveToNext() ? (int) cursor.getLong(0) : 0;
        cursor.close();
        return result;
    }

    public synchronized long getFirstHistoryItemTimestamp() {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor c = db.query(HistoryTable.TABLE_NAME, new String[]{HistoryTable.TIME},
                null, null, null, null,
                String.format("%s ASC", HistoryTable.TIME),
                "1");
        final long timestamp;
        if (c.moveToFirst()) {
            final int timestampIndex = c.getColumnIndex(HistoryTable.TIME);
            timestamp = c.getLong(timestampIndex);
        } else {
            timestamp = -1;
        }
        c.close();
        return timestamp;
    }

    public synchronized Cursor getHistoryItemsForRecyclerView(final int offset, final int limit) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        //TODO add limit and offset correctly; removed it due to a bug
        return db.rawQuery(res.getString(R.string.get_history_query_recyclerview_v7), null);
    }

    public synchronized JSONArray getHistoryItems(final int offset, final int limit) {
        final JSONArray results = new JSONArray();
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor =
                db.rawQuery(res.getString(R.string.get_history_query_v5), new String[]{
                        Integer.toString(limit),
                        Integer.toString(offset)
                });
        if (cursor.moveToFirst()) {
            final int idIndex = cursor.getColumnIndex(HistoryTable.ID);
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int timeIndex = cursor.getColumnIndex(HistoryTable.TIME);
            do {
                try {
                    final JSONObject item = new JSONObject();
                    item.put(HistoryKeys.HISTORY_ID, cursor.getLong(idIndex));
                    item.put(HistoryKeys.URL, cursor.getString(urlIndex));
                    item.put(HistoryKeys.TITLE, cursor.getString(titleIndex));
                    item.put(HistoryKeys.TIME, cursor.getLong(timeIndex));
                    results.put(item);
                } catch (JSONException e) {
                    // Ingore this org.json weirdness
                }
            } while (cursor.moveToNext());
        }
        cursor.close();
        return results;
    }

    public synchronized JSONArray getFavorites() {
        final JSONArray results = new JSONArray();
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.rawQuery(res.getString(R.string.get_favorite_query_v5), null);
        if (cursor.moveToFirst()) {
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int favTimeIndex = cursor.getColumnIndex(UrlsTable.FAV_TIME);
            do {
                try {
                    final JSONObject item = new JSONObject();
                    item.put(HistoryKeys.URL, cursor.getString(urlIndex));
                    item.put(HistoryKeys.TITLE, cursor.getString(titleIndex));
                    item.put(HistoryKeys.TIME, cursor.getLong(favTimeIndex));
                    results.put(item);
                } catch (JSONException e) {
                    // Ignore this org.json weirdness
                }
            } while (cursor.moveToNext());
        }
        cursor.close();
        return results;
    }

    public synchronized boolean isFavorite(String url) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.query(UrlsTable.TABLE_NAME,
                new String[] {UrlsTable.ID},
                String.format(Locale.US, "%s=? AND %s=1", UrlsTable.URL, UrlsTable.FAVORITE),
                new String[] {url}, null, null, null);
        final boolean result = cursor.getCount() > 0;
        cursor.close();
        return result;
    }

    public synchronized void setFavorites(String url, String title, long favTime, boolean isFavorite) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final ContentValues values = new ContentValues();
        values.put(UrlsTable.FAVORITE, isFavorite);
        values.put(UrlsTable.FAV_TIME, favTime);
        final Cursor cursor = db.rawQuery(res.getString(R.string.search_url_v5), new String[] {url});
        db.beginTransaction();
        try {
            if (cursor.getCount() > 0) {
                db.update(UrlsTable.TABLE_NAME,values, "url = ?", new String[]{url});
            } else {
                values.put(UrlsTable.URL, url);
                values.put(UrlsTable.TITLE, title);
                values.put(UrlsTable.VISITS, 0);
                db.insert(UrlsTable.TABLE_NAME, null, values);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
        cursor.close();
    }

    /**
     * Delete an history point. If the history point is the last one for a given url and the url is
     * not favorite, the method will delete the url from the urls table also
     * @param id the id of the history point
     */
    public synchronized void deleteHistoryPoint(final long id) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.rawQuery(res.getString(R.string.get_url_from_history_id_v5),
                new String[] { Long.toString(id) });
        if (cursor.moveToFirst()) {
            final long uid = cursor.getLong(cursor.getColumnIndex(UrlsTable.ID));
            final long visits = cursor.getLong(cursor.getColumnIndex(UrlsTable.VISITS)) - 1;
            final boolean favorite = cursor.getInt(cursor.getColumnIndex(UrlsTable.FAVORITE)) > 0;
            db.beginTransaction();
            try {
                db.delete(HistoryTable.TABLE_NAME, "id=?", new String[] { Long.toString(id) });
                if (visits <= 0 && !favorite) {
                    db.delete(UrlsTable.TABLE_NAME, "id=?", new String[] { Long.toString(uid) });
                } else {
                    final ContentValues value = new ContentValues();
                    value.put(UrlsTable.VISITS, visits < 0 ? 0 : visits);
                    db.update(UrlsTable.TABLE_NAME, value, "id=?", new String[] { Long.toString(uid) });
                }
                db.setTransactionSuccessful();
            } finally {
                db.endTransaction();
            }
        }
        cursor.close();
    }

    /**
     * Clear the history which is not favored
     *
     * @param deleteFavorites if true unfavorite the favored items
     */
    public synchronized void clearHistory(boolean deleteFavorites) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            if (deleteFavorites)  {
                //mark all entries in urls table as favorite = false
                ContentValues contentValues = new ContentValues();
                contentValues.put(UrlsTable.FAVORITE, false);
                db.update(UrlsTable.TABLE_NAME, contentValues, null, null);
                //delete all entries with visits = 0;
                db.delete(UrlsTable.TABLE_NAME, "visits=0", null);
            } else {
                //empty history table
                db.delete(HistoryTable.TABLE_NAME, null, null);
                //delete rows where favorite != 1
                db.delete(UrlsTable.TABLE_NAME, "favorite<1", null);
                //update "visits" of remaining rows to 0
                ContentValues contentValues = new ContentValues();
                contentValues.put(UrlsTable.VISITS, 0);
                db.update(UrlsTable.TABLE_NAME, contentValues, null, null);
            }
            db.delete(QueriesTable.TABLE_NAME, null, null);

            //way to flush ghost entries on older sqlite version
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                db.execSQL(res.getString(R.string.create_temp_urls_table_v6));
                db.execSQL("INSERT into urls_temp SELECT * from urls");
                db.execSQL("drop table urls");
                db.execSQL("drop table queries");
                db.execSQL(res.getString(R.string.create_urls_table_v6));
                db.execSQL(res.getString(R.string.create_queries_table_v7));
                db.execSQL(res.getString(R.string.create_urls_index_v5));
                db.execSQL(res.getString(R.string.create_visits_index_v5));
                db.execSQL("INSERT into urls SELECT * from urls_temp");
                db.execSQL("drop table urls_temp");
            }

            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /**
     * Update the title of the given history entry
     *
     * @param historyId the history entry id
     * @param title the new title
     */
    public void updateTitleFor(long historyId, @NonNull String title) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        // First trace back the url id from the history id
        final Cursor cursor = db.rawQuery(res.getString(R.string.get_url_from_history_id_v5),
                new String[] { Long.toString(historyId) });
        if (cursor.moveToFirst()) {
            final long id = cursor.getLong(cursor.getColumnIndex(UrlsTable.ID));
            final ContentValues contentValues = new ContentValues();
            contentValues.put(UrlsTable.TITLE, title);
            db.beginTransaction();
            try {
                final String where = String.format("%s = ?", UrlsTable.ID);
                db.update(UrlsTable.TABLE_NAME, contentValues, where, new String[] { Long.toString(id) } );
                db.setTransactionSuccessful();
            } catch (Exception ignore) {
            } finally {
                db.endTransaction();
            }
        }
        cursor.close();
    }

    /**
     * Add the domains to the blocked_topsites table
     *
     * @param domains one or more entries to add to the table
     */
    public void blockDomainsForTopsites(@NonNull String... domains) {
        if (domains.length < 1) {
            return;
        }
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            for (String domain : domains) {
                final ContentValues values = new ContentValues();
                values.put(BlockedTopSitesTable.DOMAIN, domain);
                db.insert(BlockedTopSitesTable.TABLE_NAME, null, values);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
    public synchronized void removeBlockedTopSites(){
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            if (getHistoryItemsCount()>0){
                db.delete(BlockedTopSitesTable.TABLE_NAME,null,null);
            }
            db.setTransactionSuccessful();
        }finally {
            db.endTransaction();
        }
    }

    public synchronized void addQuery(String query) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        ContentValues contentValues = new ContentValues();
        contentValues.put(QueriesTable.QUERY, query);
        contentValues.put(QueriesTable.TIME, System.currentTimeMillis());
        db.beginTransaction();
        try {
            db.insert(QueriesTable.TABLE_NAME, null, contentValues);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public void deleteQuery(long id) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            db.delete(QueriesTable.TABLE_NAME, "id=?", new String[] {Long.toString(id)});
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

}
