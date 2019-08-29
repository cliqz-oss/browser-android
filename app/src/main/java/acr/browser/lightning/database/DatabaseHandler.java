package acr.browser.lightning.database;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.database.sqlite.SQLiteOpenHelper;

import timber.log.Timber;

/**
 * @author Stefano Pacifici
 */
class DatabaseHandler {

    private final SQLiteOpenHelper helper;
    private SQLiteDatabase mDatabase = null;

    DatabaseHandler(SQLiteOpenHelper helper) {
        this.helper = helper;
        try {
            mDatabase = helper.getWritableDatabase();
        } catch (SQLiteException e) {
            /*
            We found a crash on the PlayStore related to the line in the try block. We try to
            postpone the DB creation as a partial solution due to lack of information regarding
            the problem.
            */
            mDatabase = null;
            Timber.e(e, "Can't open the DB");
        }
    }

    SQLiteDatabase getDatabase() {
        if (isClosed()) {
            mDatabase = helper.getWritableDatabase();
        }
        return mDatabase;
    }

    boolean isClosed() {
        synchronized (helper) {
            return mDatabase == null || !mDatabase.isOpen();
        }
    }

    void close() {
        if (!isClosed()) {
            mDatabase.close();
            mDatabase = null;
        }
    }

    public void forceReload() {
        close();
        mDatabase = helper.getWritableDatabase();
    }

}
