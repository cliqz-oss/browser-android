package com.cliqz.browser.telemetry;

import android.content.Context;
import android.util.Log;

import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.utils.HttpHandler;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URL;
import java.util.Locale;

import acr.browser.lightning.constant.Constants;

/**
 * @author Stefano Pacifici
 */
class TelemetrySender implements Runnable {
    private static final String TAG = TelemetrySender.class.getSimpleName();


    private final JSONArray cache;
    private final Context context;
    private static final String CONTENT_TYPE_JSON = "application/json";

    TelemetrySender(JSONArray cache, Context context) {
        this.cache = cache;
        this.context = context;
    }

    @Override
    public void run() {
        final String fileContent = cache.toString();
        final String filename = String.format(Locale.US, "%s%d.txt",
                Constants.TELEMETRY_LOG_PREFIX, System.currentTimeMillis());
        storeTelemetry(filename, fileContent);
        sendAllTelemetryFiles();
    }

    private void sendAllTelemetryFiles() {
        File directory = context.getFilesDir();
        File[] telemetryLogs = directory.listFiles(new FilenameFilter() {
            @Override
            public boolean accept(File dir, String filename) {
                return filename.startsWith(Constants.TELEMETRY_LOG_PREFIX);
            }
        });

        for(File file : telemetryLogs) {
            BufferedReader reader = null;
            try {
                if (file.length() == 0) {
                    //noinspection ResultOfMethodCallIgnored
                    file.delete();
                    continue;
                }
                reader = new BufferedReader(new FileReader(file));
                final String content = reader.readLine();
                JSONObject response = HttpHandler.sendRequest("POST", new URL("https://stats.cliqz.com"), CONTENT_TYPE_JSON, null, content);
                if(response != null && response.has("new_session")) {
                    BrowserApp.getAppComponent().getPreferenceManager().setSessionId(response.getString("new_session"));
                }
                safeClose(reader);
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            } catch (Exception e) {
                Log.e(Constants.TAG, "Failed to post telemetry to server", e);
            } finally {
                safeClose(reader);
            }
        }
    }

    private void storeTelemetry(String filename, String fileContent) {
        final File telemetryFile = new File(context.getFilesDir(), filename);
        OutputStream os = null;
        try {
            os = new FileOutputStream(telemetryFile, false);
            os.write(fileContent.getBytes());
        } catch (IOException e) {
            Log.e(TAG, "Error storing telemetry file");
        } finally {
            safeClose(os);
        }
    }

    private void safeClose(Closeable closeable) {
        if (closeable != null) {
            try {
                closeable.close();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
