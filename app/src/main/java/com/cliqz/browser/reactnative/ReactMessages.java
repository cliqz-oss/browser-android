package com.cliqz.browser.reactnative;

import android.content.pm.PackageManager;
import android.support.annotation.NonNull;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.facebook.react.bridge.Promise;

/**
 * @author Khaled Tantawy
 */
public final class ReactMessages {
    private ReactMessages() {}


    public static class CheckPermission {

        public final String permission;
        public final Promise promise;

        CheckPermission(@NonNull String permission, @NonNull Promise promise) {
            this.permission = permission;
            this.promise = promise;
        }
    }

    public static class RequestPermission extends PermissionsResultAction {
        public final String permission;
        private final Promise promise;

        RequestPermission(@NonNull String permission, @NonNull Promise promise) {
            this.permission = permission;
            this.promise = promise;
        }

        @Override
        public void onGranted() {
            promise.resolve(PackageManager.PERMISSION_GRANTED);
        }

        @Override
        public void onDenied(String permission) {
            promise.resolve(PackageManager.PERMISSION_DENIED);
        }
    }
}
