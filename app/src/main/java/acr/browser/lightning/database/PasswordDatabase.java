package acr.browser.lightning.database;

import android.content.ContentValues;
import android.content.Context;
import android.content.res.Resources;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import com.cliqz.browser.R;

/**
 * Created by Ravjit on 25/02/16.
 */
public class PasswordDatabase extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "passwordManager";
    private static final int DATABASE_VERSION = 1;
    private final DatabaseHandler dbHandler;
    private final Resources resources;

    private static final class LoginDetailsTable {
        private LoginDetailsTable() {};

        public static final String TABLE_NAME = "login_details";

        //Columns
        public static final String ID = "id";
        public static final String DOMAIN = "domain";
        public static final String LOGIN_ID = "login_id";
        public static final String PASSWORD = "password";
    }

    public PasswordDatabase(Context context) {
        super(context.getApplicationContext(), DATABASE_NAME, null, DATABASE_VERSION);
        this.resources = context.getResources();
        // Must be created after we get the resources
        this.dbHandler = new DatabaseHandler(this);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.beginTransaction();
        try {
            createV1DB(db);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    private void createV1DB(SQLiteDatabase db) {
        db.execSQL(resources.getString(R.string.create_login_details_table_v1));
        db.execSQL(resources.getString(R.string.create_login_url_index_v1));
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {

    }

    public synchronized void close() {
        dbHandler.close();
        super.close();
    }

    public synchronized LoginDetailItem getLoginDetails(String domain) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        Cursor cursor = db.query(LoginDetailsTable.TABLE_NAME,
                new String[]{LoginDetailsTable.DOMAIN,LoginDetailsTable.LOGIN_ID,LoginDetailsTable.PASSWORD},
                LoginDetailsTable.DOMAIN + " = ?", new String[]{domain}, null, null, null);
        if (cursor.moveToFirst()) {
            final int domainIndex = cursor.getColumnIndex(LoginDetailsTable.DOMAIN);
            final int loginIdIndex = cursor.getColumnIndex(LoginDetailsTable.LOGIN_ID);
            final int passwordIndex = cursor.getColumnIndex(LoginDetailsTable.PASSWORD);
            final LoginDetailItem loginDetailItem = new LoginDetailItem(
                    cursor.getString(domainIndex),
                    cursor.getString(loginIdIndex),
                    cursor.getString(passwordIndex));
            return loginDetailItem;
        } else {
            return null;
        }
    }

    public synchronized void  saveLoginDetails(LoginDetailItem loginDetailItem) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final ContentValues loginDetailValues = new ContentValues();
        loginDetailValues.put(LoginDetailsTable.DOMAIN, loginDetailItem.getDomain());
        loginDetailValues.put(LoginDetailsTable.LOGIN_ID, loginDetailItem.getLoginId());
        loginDetailValues.put(LoginDetailsTable.PASSWORD, loginDetailItem.getPassword());
        db.beginTransaction();
        try {
            db.insertWithOnConflict(LoginDetailsTable.TABLE_NAME, null, loginDetailValues,
                    SQLiteDatabase.CONFLICT_REPLACE);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();

        }
    }

    public synchronized void clearPasswords() {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            db.delete(LoginDetailsTable.TABLE_NAME, null, null);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
}
