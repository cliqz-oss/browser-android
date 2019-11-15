package com.cliqz.browser.backup;

import android.app.backup.BackupAgentHelper;
import android.app.backup.BackupDataInput;
import android.app.backup.FullBackupDataOutput;
import android.os.ParcelFileDescriptor;

import java.io.IOException;

import acr.browser.lightning.preference.PreferenceManager;
import timber.log.Timber;

public class CliqzBackupAgent extends BackupAgentHelper {

    private PreferenceManager preferenceManager;

    @Override
    public void onCreate() {
        super.onCreate();
        preferenceManager = new PreferenceManager(getApplicationContext());
    }

    @Override
    public void onFullBackup(FullBackupDataOutput data) throws IOException {
        if (preferenceManager.isAndroidBackupEnabled()) {
            Timber.i("Creating the backup");
            super.onFullBackup(data);
        } else {
            Timber.i("Android Debug Disabled");
        }
    }

    @Override
    public void onRestore(BackupDataInput data, int appVersionCode, ParcelFileDescriptor newState) throws IOException {
        if (preferenceManager.isAndroidBackupEnabled()) {
            Timber.i("Restoring the backup");
            super.onRestore(data, appVersionCode, newState);
        } else {
            Timber.i("Android Debug Disabled");
        }
    }
}
