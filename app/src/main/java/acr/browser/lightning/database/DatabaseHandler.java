package acr.browser.lightning.database;

import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

/**
 * @author Stefano Pacifici
 * @date 2016/02/18
 */
class DatabaseHandler {
    private final SQLiteOpenHelper helper;
    private SQLiteDatabase mDatabase;

    DatabaseHandler(SQLiteOpenHelper helper) {
        this.helper = helper;
        mDatabase = helper.getWritableDatabase();
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
