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
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;

import com.cliqz.browser.R;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

public class HistoryDatabase extends SQLiteOpenHelper {

    // All Static variables
    // Database Version
    private static final int DATABASE_VERSION = 4;

    // Database Name
    private static final String DATABASE_NAME = "historyManager";

    // HistoryItems table name
    private static final class UrlsTable {
        private UrlsTable() {};

        public static final String TABLE_NAME = "urls";

        // Columns
        public static final String ID = "id";
        public static final String URL = "url";
        public static final String TITLE = "title";
        public static final String VISITS = "visits";
        public static final String TIME = "time";
        public static final String FAVORITE = "favorite";
    }

    private static final class HistoryTable {
        private HistoryTable() {}

        public static final String TABLE_NAME = "history";

        //Columns
        public static final String ID = "id";
        public static final String URL_ID = "url_id";
        public static final String TIME = "time";
        public static final String FAVORITE = "favorite";
    }

    public static final class JsonKeys {
        private JsonKeys() {}

        // Fields
        public static final String URL_ID = "uid";
        public static final String HISTORY_ID = "id";
        public static final String URL = "url";
        public static final String TITLE = "title";
        public static final String FAVORITE = "favorite";
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
            createV4DB(db);
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
                    // !!! Remeber the break here !!!
                    db.setTransactionSuccessful();
                    break;
                default:
                    // Drop older table if it exists
                    db.execSQL("DROP TABLE IF EXISTS " + UrlsTable.TABLE_NAME);
                    db.execSQL("DROP TABLE IF EXISTS " + HistoryTable.TABLE_NAME);
                    // Create tables again
                    createV4DB(db);

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
        Cursor q = db.query(false, UrlsTable.TABLE_NAME,
                new String[]{UrlsTable.ID, UrlsTable.VISITS},
                UrlsTable.URL + " = ?", new String[]{url}, null, null, null, "1");
        final long time = System.currentTimeMillis();
        final ContentValues urlsValues = new ContentValues();
        urlsValues.put(UrlsTable.URL, url);
        urlsValues.put(UrlsTable.TITLE, title);
        urlsValues.put(UrlsTable.VISITS, 0l);
        urlsValues.put(UrlsTable.TIME, time);
        db.beginTransaction();
        long historyID = -1;
        try {
            final long urlId;
            if (q.getCount() > 0) {
                q.moveToFirst();
                final int idIndex = q.getColumnIndex(UrlsTable.ID);
                final int visitsIndex = q.getColumnIndex(UrlsTable.VISITS);
                urlId = q.getLong(idIndex);
                final long visits = q.getLong(visitsIndex);
                urlsValues.put(UrlsTable.VISITS, visits + 1l);
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
        } finally {
            db.endTransaction();
            return historyID;
        }
    }

    /**
     * Query the history db to fetch the top most visited websites.
     * @param limit the number of items to return
     * @return a list of {@link JsonObject}. The time stamp of these elements is always -1.
     */
    public synchronized JsonArray getTopSites(int limit) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        if (limit < 1) {
            limit = 1;
        } else if (limit > 100) {
            limit = 100;
        }
        final JsonArray itemList = new JsonArray();
        Cursor cursor = db.rawQuery(res.getString(R.string.get_top_sites_v4), null);
        int counter = 0;
        if (cursor.moveToFirst()) {
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            do {
                final JsonObject item = new JsonObject();
                item.addProperty(JsonKeys.URL, cursor.getString(urlIndex));
                item.addProperty(JsonKeys.TITLE, cursor.getString(titleIndex));
                itemList.add(item);
                counter++;
            } while (cursor.moveToNext() && counter < 100);
        }
        cursor.close();
        return itemList;
    }


    public synchronized JsonArray findItemsContaining(@Nullable String search, int limit) {
        final JsonArray itemList = new JsonArray();
        if (search == null) {
            return itemList;
        }
        final SQLiteDatabase mDatabase = dbHandler.getDatabase();
        if (limit <= 0) {
            limit = 5;
        }
        final String formattedSearch = String.format("%%%s%%", search);
        final String selectQuery = res.getString(R.string.seach_history_query_v4);
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
                final JsonObject item = new JsonObject();
                item.addProperty(JsonKeys.URL, cursor.getString(urlIndex));
                item.addProperty(JsonKeys.TITLE, cursor.getString(titleIndex));
                itemList.add(item);
                n++;
            } while (cursor.moveToNext() && n < limit);
        }
        cursor.close();
        return itemList;
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

    public synchronized JsonArray getHistoryItems(final int start, final int end) {
        final JsonArray results = new JsonArray();
        if (start >= end) {
            return results;
        }
        final SQLiteDatabase db = dbHandler.getDatabase();
        final int limit = end - start;
        final Cursor cursor =
                db.rawQuery(res.getString(R.string.get_history_query_v4), new String[]{
                        Integer.toString(limit),
                        Integer.toString(start)
                });
        if (cursor.moveToFirst()) {
            final int idIndex = cursor.getColumnIndex(HistoryTable.ID);
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int favoriteIndex = cursor.getColumnIndex(HistoryTable.FAVORITE);
            final int timeIndex = cursor.getColumnIndex(HistoryTable.TIME);
            do {
                final JsonObject item = new JsonObject();
                item.addProperty(JsonKeys.HISTORY_ID, cursor.getLong(idIndex));
                item.addProperty(JsonKeys.URL, cursor.getString(urlIndex));
                item.addProperty(JsonKeys.TITLE, cursor.getString(titleIndex));
                item.addProperty(JsonKeys.FAVORITE, cursor.getInt(favoriteIndex) > 0);
                item.addProperty(JsonKeys.TIME, cursor.getLong(timeIndex));
                results.add(item);
            } while (cursor.moveToNext());
        }
        cursor.close();
        return results;
    }

    /**
     * The bookmarked ulrs list
     * @return The bookmarks as a json array
     */
    public synchronized JsonArray getBookmarks() {
        final JsonArray results = new JsonArray();
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.query(UrlsTable.TABLE_NAME, null,
                "favorite > 0", null, null, null, null);
        if (cursor.moveToFirst()) {
            final int idIndex = cursor.getColumnIndex(UrlsTable.ID);
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int timeIndex = cursor.getColumnIndex(UrlsTable.TIME);
            do {
                final JsonObject item = new JsonObject();
                item.addProperty(JsonKeys.URL_ID, cursor.getLong(idIndex));
                item.addProperty(JsonKeys.URL, cursor.getString(urlIndex));
                item.addProperty(JsonKeys.TITLE, cursor.getString(titleIndex));
                item.addProperty(JsonKeys.TIME, cursor.getLong(timeIndex));
                results.add(item);
            } while (cursor.moveToNext());
        }
        cursor.close();
        return results;
    }

    /**
     * The favorite history points ulrs list
     * @return The bookmarks as a json array
     */
    public synchronized JsonArray getHistoryFavorites() {
        final JsonArray results = new JsonArray();
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.rawQuery(res.getString(R.string.get_history_favorite_v4), null);
        if (cursor.moveToFirst()) {
            final int idIndex = cursor.getColumnIndex(HistoryTable.ID);
            final int urlIndex = cursor.getColumnIndex(UrlsTable.URL);
            final int titleIndex = cursor.getColumnIndex(UrlsTable.TITLE);
            final int timeIndex = cursor.getColumnIndex(HistoryTable.TIME);
            do {
                final JsonObject item = new JsonObject();
                item.addProperty(JsonKeys.URL_ID, cursor.getLong(idIndex));
                item.addProperty(JsonKeys.URL, cursor.getString(urlIndex));
                item.addProperty(JsonKeys.TITLE, cursor.getString(titleIndex));
                item.addProperty(JsonKeys.TIME, cursor.getLong(timeIndex));
                results.add(item);
            } while (cursor.moveToNext());
        }
        cursor.close();
        return results;
    }

    /**
     * Mark an history point as favorite or remove the favorite status
     * @param id an History Table id
     * @param favorite true to mark the history point as a favorite, false otherwise
     */
    public synchronized void addToFavourites(final long id, boolean favorite) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final ContentValues values = new ContentValues();
        values.put(HistoryTable.FAVORITE, favorite);
        db.update(HistoryTable.TABLE_NAME, values, "id = ?", new String[]{Long.toString(id)});
    }

    /**
     * Delete an history point. If the history point is the last one for a given url and the url is
     * not favorite, the method will delete the url from the urls table also
     * @param id the id of the history point
     */
    public synchronized void deleteHistoryPoint(final long id) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.rawQuery(res.getString(R.string.get_url_from_by_history_id_v4),
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
     * Clear the history, can delete also the favorites
     *
     * @param deleteFavorites if true delete also the favorites
     */
    public synchronized void clearHistory(boolean deleteFavorites) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            // Create cleanup table
            db.execSQL(res.getString(R.string.create_temp_cleanup_table_v4));
            // Delete from the history table (preserving or not the favorites)
            if (deleteFavorites) {
                db.delete(HistoryTable.TABLE_NAME, null, null);
            } else {
                db.delete(HistoryTable.TABLE_NAME, "favorite<1", null);
            }
            // Restore still existing entries in the urls table if needed
            if (!deleteFavorites) {
                db.execSQL(res.getString(R.string.restore_favorite_urls_v4));
            }
            // Drop the original urls tablse
            db.execSQL(res.getString(R.string.drop_temporary_urls_table_v4));
            // Rename the cleanup table
            db.execSQL(res.getString(R.string.move_cleanup_table_to_urls_v4));
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
}
