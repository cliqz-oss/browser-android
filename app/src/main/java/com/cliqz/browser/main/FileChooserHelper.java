package com.cliqz.browser.main;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;

import java.io.File;
import java.lang.ref.WeakReference;
import java.util.ArrayList;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.utils.Utils;
import timber.log.Timber;

/**
 * @author Stefano Pacifici
 */
class FileChooserHelper {

    private static final String TAG = FileChooserHelper.class.getSimpleName();

    private ValueCallback mCallback = null;
    private Class mCallbackType = null;

    private final WeakReference<MainActivity> mainActivityWeakReference;
    // Store temporary picture path
    private File mPhotoFile;

    FileChooserHelper(MainActivity mainActivity) {
        mainActivityWeakReference = new WeakReference<>(mainActivity);
    }


    /**
     * Handle showing a dialog to upload a file
     *
     * @param event Parameters for the file chooser
     */
    void showFileChooser(BrowserEvents.ShowFileChooser event) {
        final MainActivity mainActivity = mainActivityWeakReference.get();
        if (mCallback != null) {
            //noinspection unchecked
            mCallback.onReceiveValue(null);
        }
        if (mainActivity == null) {
            return;
        }

        mCallback = event.valueCallback;
        mCallbackType = event.callbackParamType;

        final String[] acceptTypes;
        final boolean captureEnabled;
        final String title;
        final WebChromeClient.FileChooserParams params = event.fileChooserParams;
        if (params != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            acceptTypes = params.getAcceptTypes();
            captureEnabled = params.isCaptureEnabled();
            final CharSequence t = params.getTitle();
            title = t != null ? t.toString() : mainActivity.getString(R.string.upload_file_title);
        } else {
            acceptTypes = event.acceptType != null ?
                    new String[]{event.acceptType} : new String[] { "*/*" };
            captureEnabled = false;
            title = mainActivity.getString(R.string.upload_file_title);
        }

        final ArrayList<String> permissions = new ArrayList<>();
        permissions.add(android.Manifest.permission.READ_EXTERNAL_STORAGE);
        if (captureEnabled) {
            permissions.add(android.Manifest.permission.WRITE_EXTERNAL_STORAGE);
            permissions.add(android.Manifest.permission.CAMERA);
        }
        final PermissionsAction action =
                new PermissionsAction(title, acceptTypes, captureEnabled);

        String[] permissionsArray = new String[permissions.size()];
        permissionsArray = permissions.toArray(permissionsArray);
        PermissionsManager
                .getInstance()
                .requestPermissionsIfNecessaryForResult(mainActivity, action, permissionsArray);
    }

    private void resetCallback(boolean callIt) {
        final ValueCallback callback = mCallback;
        mCallback = null;
        mCallbackType = null;
        mPhotoFile = null;
        if (callback != null && callIt) {
            //noinspection unchecked
            callback.onReceiveValue(null);
        }
    }

    private void showIntentChooser(String title, boolean captureEnabled) {
        final MainActivity mainActivity = mainActivityWeakReference.get();
        final ValueCallback callback = mCallback;
        if (mainActivity == null) {
            resetCallback(true);
            return;
        }

        Intent intent;
        if (captureEnabled) {
            try {
                final Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                if (takePictureIntent.resolveActivity(mainActivity.getPackageManager()) == null) {
                    throw new Exception("No camera intent");
                }
                // Create the File where the photo should go
                mPhotoFile = Utils.createImageFile();
                takePictureIntent.putExtra("PhotoPath", Uri.fromFile(mPhotoFile));
                takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(mPhotoFile));
                intent = takePictureIntent;
            } catch (Exception e) {
                Timber.e(e, "Can't capture pictures");
                intent = null;
            }
        } else {
            intent = new Intent(Intent.ACTION_GET_CONTENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
        }

        if (intent != null) {
            Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
            chooserIntent.putExtra(Intent.EXTRA_INTENT, intent);
            chooserIntent.putExtra(Intent.EXTRA_TITLE, title);
            mainActivity.startActivityForResult(chooserIntent, MainActivity.FILE_UPLOAD_REQUEST_CODE);
        } else if (callback != null){
            resetCallback(true);
        }
    }

    void notifyResultCancel() {
       resetCallback(true);
    }

    void notifyResultOk(Intent data) {
        final ValueCallback callback = mCallback;
        if (callback == null) {
            return;
        }
        final Class callbackType = mCallbackType;
        final Uri result;
        if (mPhotoFile != null) {
            result = Uri.fromFile(mPhotoFile);
        } else if (data != null) {
           result = data.getData();
        } else {
            return;
        }
        if (callbackType == Uri.class) {
            //noinspection unchecked
            callback.onReceiveValue(result);
        } else if (callbackType == Uri[].class && result != null) {
            //noinspection unchecked
            callback.onReceiveValue(new Uri[] { result });
        } else {
            //noinspection unchecked
            callback.onReceiveValue(null);
        }
        resetCallback(false);
    }

    class PermissionsAction extends PermissionsResultAction {
        final String[] acceptTypes;
        final boolean captureEnabled;
        final String title;

        PermissionsAction(String title, String[] acceptTypes, boolean captureEnabled) {
            this.acceptTypes = acceptTypes;
            this.captureEnabled = captureEnabled;
            this.title = title;
        }

        @Override
        public void onGranted() {
            showIntentChooser(title, captureEnabled);
        }

        @Override
        public void onDenied(String permission) {
            resetCallback(true);
        }
    }
}
