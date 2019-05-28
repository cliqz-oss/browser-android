/*
 * Copyright 2014 A.C.R. Development
 */
package acr.browser.lightning.utils;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Shader;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.StringRes;
import com.google.android.material.snackbar.Snackbar;
import androidx.core.content.FileProvider;
import androidx.appcompat.app.AlertDialog;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.webkit.URLUtil;

import com.anthonycr.grant.PermissionsManager;
import com.anthonycr.grant.PermissionsResultAction;
import com.cliqz.browser.R;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.Closeable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.download.DownloadHandler;
import acr.browser.lightning.preference.PreferenceManager;

import static acr.browser.lightning.download.DownloadHandler.DEFAULT_DOWNLOAD_PATH;
import static acr.browser.lightning.download.DownloadHandler.addNecessarySlashes;

public final class Utils {

    private static final String TAG = Utils.class.getSimpleName();

    public static void downloadFile(final Activity activity, final String url,
                                    final String userAgent, final String contentDisposition, final boolean isYouTubeVideo) {
        PermissionsManager.getInstance().requestPermissionsIfNecessaryForResult(activity, new PermissionsResultAction() {
            @Override
            public void onGranted() {
                String fileName = URLUtil.guessFileName(url, null, null);
                DownloadHandler.onDownloadStart(activity, url, userAgent, contentDisposition, null,
                        isYouTubeVideo);
                Utils.showSnackbar(activity, activity.getString(R.string.download_started));
                Log.i(Constants.TAG, "Downloading" + fileName);
            }

            @Override
            public void onDenied(String permission) {
                // TODO Show Message
            }
        }, Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE);
    }

    public static Intent newEmailIntent(String address, String subject,
                                        String body, String cc) {
        Intent intent = new Intent(Intent.ACTION_SEND);
        intent.putExtra(Intent.EXTRA_EMAIL, new String[]{address});
        intent.putExtra(Intent.EXTRA_TEXT, body);
        intent.putExtra(Intent.EXTRA_SUBJECT, subject);
        intent.putExtra(Intent.EXTRA_CC, cc);
        intent.setType("message/rfc822");
        return intent;
    }

    public static void createInformativeDialog(Context context, @StringRes int title, @StringRes int message) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(title);
        builder.setMessage(message)
                .setCancelable(true)
                .setPositiveButton(context.getResources().getString(R.string.action_ok),
                        new DialogInterface.OnClickListener() {
                            @Override
                            public void onClick(DialogInterface dialog, int id) {
                            }
                        });
        AlertDialog alert = builder.create();
        alert.show();
    }

    /**
     * Display a Snackbar with a message
     *
     * @param resource String resource of the message to be displayed
     */
    public static void showSnackbar(@NonNull Activity activity, @StringRes int resource) {
        View view = activity.findViewById(android.R.id.content);
        if (view == null) {
            return;
        }
        Snackbar.make(view, resource, Snackbar.LENGTH_LONG).show();
    }

    /**
     * Display a Snackbar with a message
     *
     * @param message Message to be displayed
     */
    public static void showSnackbar(@NonNull Activity activity, String message) {
        View view = activity.findViewById(android.R.id.content);
        if (view == null) {
            return;
        }
        Snackbar.make(view, message, Snackbar.LENGTH_LONG).show();
    }

    /**
     * Display a SnackBar with a message and a action button
     *
     * @param message       Message to be displayed
     * @param action        Name of the action
     * @param eventListener Implementation of the OnClickListener for the action
     */
    public static void showSnackbar(@NonNull Activity activity, String message, String action,
                                    View.OnClickListener eventListener) {
        View view = activity.findViewById(android.R.id.content);
        if (view == null) {
            return;
        }
        Snackbar.make(view, message, Snackbar.LENGTH_LONG)
                .setAction(action, eventListener)
                .show();
    }

    /**
     * Converts Density Pixels (DP) to Pixels (PX)
     *
     * @param dp the number of density pixels to convert
     * @return the number of pixels
     */
    public static int dpToPx(int dp) {
        DisplayMetrics metrics = Resources.getSystem().getDisplayMetrics();
        return (int) (dp * metrics.density + 0.5f);
    }

    public static String getDomainName(String url) {
        if (url == null || url.isEmpty()) return "";

        boolean ssl = url.startsWith(Constants.HTTPS);
        int index = url.indexOf('/', 8);
        if (index != -1) {
            url = url.substring(0, index);
        }

        URI uri;
        String domain;
        try {
            uri = new URI(url);
            domain = uri.getHost();
        } catch (URISyntaxException e) {
            e.printStackTrace();
            domain = null;
        }

        if (domain == null || domain.isEmpty()) {
            return url;
        }
        if (ssl)
            return Constants.HTTPS + domain;
        else
            return domain.startsWith("www.") ? domain.substring(4) : domain;
    }

    public static String getProtocol(String url) {
        int index = url.indexOf('/');
        return url.substring(0, index + 2);
    }

    public static String[] getArray(String input) {
        return input.split(Constants.SEPARATOR);
    }

    public static void trimCache(Context context) {
        try {
            File dir = context.getCacheDir();

            if (dir != null && dir.isDirectory()) {
                deleteDir(dir);
            }
        } catch (Exception ignored) {

        }
    }

    static boolean deleteDir(File dir) {
        if (dir != null && dir.isDirectory()) {
            String[] children = dir.list();
            for (String aChildren : children) {
                boolean success = deleteDir(new File(dir, aChildren));
                if (!success) {
                    return false;
                }
            }
        }
        // The directory is now empty so delete it
        return dir != null && dir.delete();
    }

    /**
     * Creates and returns a new favicon which is the same as the provided
     * favicon but with horizontal or vertical padding of 4dp
     *
     * @param bitmap is the bitmap to pad.
     * @return the padded bitmap.
     */
    public static Bitmap padFavicon(Bitmap bitmap) {
        int padding = Utils.dpToPx(4);

        Bitmap paddedBitmap = Bitmap.createBitmap(bitmap.getWidth() + padding, bitmap.getHeight()
                + padding, Bitmap.Config.ARGB_8888);

        Canvas canvas = new Canvas(paddedBitmap);
        canvas.drawARGB(0x00, 0x00, 0x00, 0x00); // this represents white color
        canvas.drawBitmap(bitmap, padding / 2, padding / 2, new Paint(Paint.FILTER_BITMAP_FLAG));

        return paddedBitmap;
    }

    public static boolean isColorTooDark(int color) {
        final byte RED_CHANNEL = 16;
        final byte GREEN_CHANNEL = 8;
        //final byte BLUE_CHANNEL = 0;

        int r = ((int) ((float) (color >> RED_CHANNEL & 0xff) * 0.3f)) & 0xff;
        int g = ((int) ((float) (color >> GREEN_CHANNEL & 0xff) * 0.59)) & 0xff;
        int b = ((int) ((float) (color /* >> BLUE_CHANNEL */ & 0xff) * 0.11)) & 0xff;
        int gr = (r + g + b) & 0xff;
        int gray = gr /* << BLUE_CHANNEL */ + (gr << GREEN_CHANNEL) + (gr << RED_CHANNEL);

        return gray < 0x727272;
    }

    public static int mixTwoColors(int color1, int color2, float amount) {
        final byte ALPHA_CHANNEL = 24;
        final byte RED_CHANNEL = 16;
        final byte GREEN_CHANNEL = 8;
        //final byte BLUE_CHANNEL = 0;

        final float inverseAmount = 1.0f - amount;

        int r = ((int) (((float) (color1 >> RED_CHANNEL & 0xff) * amount) + ((float) (color2 >> RED_CHANNEL & 0xff) * inverseAmount))) & 0xff;
        int g = ((int) (((float) (color1 >> GREEN_CHANNEL & 0xff) * amount) + ((float) (color2 >> GREEN_CHANNEL & 0xff) * inverseAmount))) & 0xff;
        int b = ((int) (((float) (color1 & 0xff) * amount) + ((float) (color2 & 0xff) * inverseAmount))) & 0xff;

        return 0xff << ALPHA_CHANNEL | r << RED_CHANNEL | g << GREEN_CHANNEL | b;
    }

    @SuppressLint("SimpleDateFormat")
    public static File createImageFile() throws IOException {
        // Create an image file name
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
        String imageFileName = "JPEG_" + timeStamp + '_';
        File storageDir = Environment
                .getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
        return File.createTempFile(imageFileName, /* prefix */
                ".jpg", /* suffix */
                storageDir /* directory */
        );
    }

    /**
     * Checks if flash player is installed
     *
     * @param context the context needed to obtain the PackageManager
     * @return true if flash is installed, false otherwise
     */
    public static boolean isFlashInstalled(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            ApplicationInfo ai = pm.getApplicationInfo("com.adobe.flashplayer", 0);
            if (ai != null) {
                return true;
            }
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
        return false;
    }

    /**
     * Quietly closes a closeable object like an InputStream or OutputStream without
     * throwing any errors or requiring you do do any checks.
     *
     * @param closeable the object to close
     */
    public static void close(Closeable closeable) {
        if (closeable == null)
            return;
        try {
            closeable.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static Drawable getDrawable(Context context, @DrawableRes int res) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return context.getDrawable(res);
        } else {
            return context.getResources().getDrawable(res);
        }
    }

    /**
     * Draws the trapezoid background for the horizontal tabs on a canvas object using
     * the specified color.
     *
     * @param canvas the canvas to draw upon
     * @param color  the color to use to draw the tab
     */
    public static void drawTrapezoid(Canvas canvas, int color, boolean withShader) {

        Paint paint = new Paint();
        paint.setColor(color);
        paint.setStyle(Paint.Style.FILL);
//        paint.setFilterBitmap(true);
        paint.setAntiAlias(true);
        paint.setDither(true);
        if (withShader) {
            paint.setShader(new LinearGradient(0, 0.9f * canvas.getHeight(),
                    0, canvas.getHeight(),
                    color, mixTwoColors(Color.BLACK, color, 0.5f),
                    Shader.TileMode.CLAMP));
        } else {
            paint.setShader(null);
        }
        int width = canvas.getWidth();
        int height = canvas.getHeight();
        double radians = Math.PI / 3;
        int base = (int) (height / Math.tan(radians));

        Path wallpath = new Path();
        wallpath.reset();
        wallpath.moveTo(0, height);
        wallpath.lineTo(width, height);
        wallpath.lineTo(width - base, 0);
        wallpath.lineTo(base, 0);
        wallpath.close();

        canvas.drawPath(wallpath, paint);
    }


    private static Boolean isSystemBrowserPresent = null;

    /**
     * Check if the system browser is available, it caches the result so calling it multiple times
     * doesn't imply wasting resources.
     *
     * @param context needed to get a {@link android.content.ContentResolver}
     * @return true if the system browser is present, false otherwise
     * @author Stefano Pacifici
     */
    public static boolean isSystemBrowserPresent(Context context) {
        if (isSystemBrowserPresent != null) {
            return isSystemBrowserPresent;
        }

        Cursor c = null;
        String[] columns = new String[]{"url", "title"};
        boolean browserFlag;
        try {
            Uri bookmarks = Uri.parse("content://browser/bookmarks");
            c = context.getContentResolver().query(bookmarks, columns, null, null, null);
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (c != null) {
            Log.d("Browser", "System Browser Available");
            browserFlag = true;
        } else {
            Log.e("Browser", "System Browser Unavailable");
            browserFlag = false;
        }
        if (c != null) {
            c.close();
        }
        isSystemBrowserPresent = new Boolean(browserFlag);
        return browserFlag;
    }

    /**
     * Decodes a base64 image data and writes it to a image file
     *
     * @param url Url or string with the base64 data
     */
    public static void writeBase64ToStorage(final Activity activity, final String url) {
        final String downloadLocation = addNecessarySlashes(DEFAULT_DOWNLOAD_PATH);
        final String base64ImageData = url.replace("data:image/jpeg;base64,", "");
        FileOutputStream fos;
        try {
            if (base64ImageData != null) {
                final File outputFile = new File(downloadLocation, findValidFileName("image") + ".jpg");
                if (!outputFile.exists()) {
                    outputFile.createNewFile();
                }
                fos = new FileOutputStream(outputFile);
                byte[] decodedString = android.util.Base64.decode(base64ImageData, android.util.Base64.DEFAULT);
                fos.write(decodedString);
                fos.flush();
                fos.close();
                //Below code is necessary to make the file visible in Downloads/Photos app
                final Uri contentUri;
                if ( Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    contentUri = FileProvider.getUriForFile(activity,
                            activity.getApplicationContext().getPackageName() + ".provider", outputFile);
                } else {
                    contentUri = Uri.fromFile(outputFile);
                }
                final Intent mediaScanIntent = new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE);
                mediaScanIntent.setData(contentUri);
                activity.sendBroadcast(mediaScanIntent);
                //Code to show Download successful Snackbar
                final View.OnClickListener onClickListener = new View.OnClickListener() {
                    @Override
                    public void onClick(View v) {
                        final Intent intent = new Intent();
                        intent.setAction(Intent.ACTION_VIEW);
                        intent.setDataAndType(contentUri, "image/jpeg");
                        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        activity.startActivity(intent);
                    }
                };
                Utils.showSnackbar(activity, activity.getString(R.string.download_successful),
                        activity.getString(R.string.action_open), onClickListener);
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    //recursive function to find a unique file name for the new download
    private static String findValidFileName(String suggestedFileName) {
        final String downloadLocation = addNecessarySlashes(DEFAULT_DOWNLOAD_PATH);
        final File outputFile = new File(downloadLocation, suggestedFileName + ".jpg");
        if (outputFile.exists()) {
            if (suggestedFileName.equals("image")) {
                return findValidFileName(suggestedFileName + "1");
            } else {
                final int suffixNum = Integer.parseInt(suggestedFileName.substring(suggestedFileName.length() - 1));
                return findValidFileName(suggestedFileName.replace(Integer.toString(suffixNum),
                        Integer.toString(suffixNum + 1)));
            }
        } else {
            return suggestedFileName;
        }
    }

    public static void updateUserLocation(final PreferenceManager preferenceManager) {
        final String locationUrl = "https://api.cliqz.com/api/v1/config";
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    final URL url = new URL(locationUrl);
                    final HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                    if (connection.getResponseCode() == 200) {
                        final String response = readResponse(connection.getInputStream());
                        final JSONObject responseJSON = new JSONObject(response);
                        final String location = responseJSON.optString("location", "de");
                        preferenceManager.setLastKnownLocation(location);
                    }
                    connection.disconnect();
                } catch (IOException e) {
                    Log.e(TAG, "IOEXception");
                } catch (JSONException e) {
                    Log.e(TAG, "Error parsing the response");
                }
            }
        }).start();
    }

    public static String readResponse(InputStream inputStream) {
        final StringBuilder builder = new StringBuilder("");
        final char[] buffer = new char[1024];
        final Reader reader = new InputStreamReader(inputStream);
        try {
            for (int read = reader.read(buffer); read > -1; read = reader.read(buffer)) {
                builder.append(buffer, 0, read);
            }
            reader.close();
        } catch (IOException e) {
            Log.e(TAG, "Can't read from connection", e);
        }
        return builder.toString();
    }

    public static String getPostDataString(JSONObject params) throws UnsupportedEncodingException, JSONException {
        final StringBuilder result = new StringBuilder();
        boolean first = true;
        final Iterator<String> itr = params.keys();
        while (itr.hasNext()) {
            final String key = itr.next();
            final Object value = params.get(key);
            if (first) {
                first = false;
            } else {
                result.append("&");
            }
            result.append(URLEncoder.encode(key, "UTF-8"));
            result.append("=");
            result.append(URLEncoder.encode(value.toString(), "UTF-8"));
        }
        return result.toString();
    }


    // @TODO Moaz use ReadableMap instead of converting JSON
    public static JSONObject convertMapToJson(ReadableMap readableMap) throws JSONException {
        JSONObject object = new JSONObject();
        ReadableMapKeySetIterator iterator = readableMap.keySetIterator();
        while (iterator.hasNextKey()) {
            String key = iterator.nextKey();
            switch (readableMap.getType(key)) {
                case Null:
                    object.put(key, JSONObject.NULL);
                    break;
                case Boolean:
                    object.put(key, readableMap.getBoolean(key));
                    break;
                case Number:
                    object.put(key, readableMap.getDouble(key));
                    break;
                case String:
                    object.put(key, readableMap.getString(key));
                    break;
                case Map:
                    object.put(key, convertMapToJson(readableMap.getMap(key)));
                    break;
                case Array:
                    object.put(key, convertArrayToJson(readableMap.getArray(key)));
                    break;
            }
        }
        return object;
    }

    // @TODO Moaz use ReadableArray instead of converting JSON
    public static JSONArray convertArrayToJson(ReadableArray readableArray) throws JSONException {
        JSONArray array = new JSONArray();
        for (int i = 0; i < readableArray.size(); i++) {
            switch (readableArray.getType(i)) {
                case Null:
                    break;
                case Boolean:
                    array.put(readableArray.getBoolean(i));
                    break;
                case Number:
                    array.put(readableArray.getDouble(i));
                    break;
                case String:
                    array.put(readableArray.getString(i));
                    break;
                case Map:
                    array.put(convertMapToJson(readableArray.getMap(i)));
                    break;
                case Array:
                    array.put(convertArrayToJson(readableArray.getArray(i)));
                    break;
            }
        }
        return array;
    }

    public static boolean isFirstInstall(Context context) {
        final PackageInfo packageInfo;
        try {
            packageInfo = context.getPackageManager().getPackageInfo(context
                            .getPackageName(),
                    0);
            return packageInfo.firstInstallTime == packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG,e.getMessage(),e);
            return true;
        }
    }

}
