package acr.browser.lightning.database;

import android.content.ContentValues;
import android.content.Context;
import android.content.res.Resources;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.R;

/**
 * @author Ravjit Uppal
 */
public class PasswordDatabase extends SQLiteOpenHelper {

    private static final String DATABASE_NAME = "passwordManager";
    private static final int DATABASE_VERSION = 2;
    private final DatabaseHandler dbHandler;
    private final Resources resources;

    private static final class LoginDetailsTable {
        private LoginDetailsTable() {}

        static final String TABLE_NAME = "login_details";

        //Columns
        public static final String ID = "id";
        static final String DOMAIN = "domain";
        static final String LOGIN_ID = "login_id";
        static final String PASSWORD = "password";
    }

    @SuppressWarnings("unused")
    private static final class BlackListedDomainsTable {
        private BlackListedDomainsTable() {}

        static final String TABLE_NAME = "blacklisted_sites";

        static final String ID = "id";
        static final String DOMAIN = "domain";
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
            createV2DB(db);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    private void createV2DB(SQLiteDatabase db) {
        db.execSQL(resources.getString(R.string.create_login_details_table_v1));
        db.execSQL(resources.getString(R.string.create_login_url_index_v1));
        db.execSQL(resources.getString(R.string.create_blacklist_table_v2));
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.beginTransaction();
        try {
            switch (oldVersion) {
                case 1:
                    db.execSQL(resources.getString(R.string.create_blacklist_table_v2));
                    db.setTransactionSuccessful();
                    break;
                default:
                    db.execSQL("DROP TABLE IF EXISTS " + LoginDetailsTable.TABLE_NAME);
                    db.execSQL("DROP TABLE IF EXISTS " + BlackListedDomainsTable.TABLE_NAME);
                    createV2DB(db);
                    db.setTransactionSuccessful();
            }
        } finally {
            db.endTransaction();
        }
    }

    public synchronized void close() {
        dbHandler.close();
        super.close();
    }

    @Nullable
    public synchronized LoginDetailItem getLoginDetails(@Nullable String domain) {
        if (domain == null || domain.isEmpty()) {
            return null;
        }
        final SQLiteDatabase db = dbHandler.getDatabase();
        final Cursor cursor = db.query(LoginDetailsTable.TABLE_NAME,
                new String[]{LoginDetailsTable.DOMAIN,LoginDetailsTable.LOGIN_ID,LoginDetailsTable.PASSWORD},
                LoginDetailsTable.DOMAIN + " = ?", new String[]{domain}, null, null, null);
        //noinspection TryFinallyCanBeTryWithResources
        try {
            if (cursor.moveToFirst()) {
                final int domainIndex = cursor.getColumnIndex(LoginDetailsTable.DOMAIN);
                final int loginIdIndex = cursor.getColumnIndex(LoginDetailsTable.LOGIN_ID);
                final int passwordIndex = cursor.getColumnIndex(LoginDetailsTable.PASSWORD);
                return new LoginDetailItem(
                        cursor.getString(domainIndex),
                        cursor.getString(loginIdIndex),
                        cursor.getString(passwordIndex));
            } else {
                return null;
            }
        } finally {
            cursor.close();
        }
    }

    public synchronized void saveLoginDetails(@NonNull LoginDetailItem loginDetailItem) {
        final SQLiteDatabase db = dbHandler.getDatabase();
        final ContentValues loginDetailValues = new ContentValues();
        loginDetailValues.put(LoginDetailsTable.DOMAIN, loginDetailItem.domain);
        loginDetailValues.put(LoginDetailsTable.LOGIN_ID, loginDetailItem.loginId);
        loginDetailValues.put(LoginDetailsTable.PASSWORD, loginDetailItem.password);
        db.beginTransaction();
        try {
            db.insertWithOnConflict(LoginDetailsTable.TABLE_NAME, null, loginDetailValues,
                    SQLiteDatabase.CONFLICT_REPLACE);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();

        }
    }

    public synchronized void addDomainToBlackList(@Nullable String domain) {
        if (domain == null || domain.isEmpty()) {
            return;
        }
        final SQLiteDatabase db = dbHandler.getDatabase();
        final ContentValues contentValues = new ContentValues();
        contentValues.put(BlackListedDomainsTable.DOMAIN, domain);
        db.beginTransaction();
        try {
            db.insert(BlackListedDomainsTable.TABLE_NAME, null, contentValues);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    public synchronized boolean isDomainBlackListed(@Nullable String domain) {
        if (domain == null || domain.isEmpty()) {
            return true;
        }
        final String query = "SELECT * FROM " + BlackListedDomainsTable.TABLE_NAME + " WHERE "
                + BlackListedDomainsTable.DOMAIN + " =?";
        final Cursor cursor = dbHandler.getDatabase().rawQuery(query, new String[]{domain});
        final boolean result = cursor.moveToFirst();
        cursor.close();
        return result;
    }

    public synchronized void clearBlackList() {
        final SQLiteDatabase db = dbHandler.getDatabase();
        db.beginTransaction();
        try {
            db.delete(BlackListedDomainsTable.TABLE_NAME, null, null);
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
