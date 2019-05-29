package com.cliqz.browser.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.annotation.NonNull;

import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.security.ProviderInstaller;

class TLSProviderInstaller implements ProviderInstaller.ProviderInstallListener {

    private final Context context;

    private TLSProviderInstaller(@NonNull Context context) {
        this.context = context;
    }

    @Override
    public void onProviderInstalled() {

    }

    @Override
    public void onProviderInstallFailed(int i, Intent intent) {
        GoogleApiAvailability.getInstance().showErrorNotification(context, i);
    }

    static void install(@NonNull Context context) {
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.KITKAT) {
            final TLSProviderInstaller installer = new TLSProviderInstaller(context);
            ProviderInstaller.installIfNeededAsync(context, installer);
        }
    }
}
