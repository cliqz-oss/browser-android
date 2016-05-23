package com.cliqz.browser.utils;

import android.content.Context;
import android.util.Log;

import com.cliqz.browser.app.BrowserApp;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.Closeable;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

import acr.browser.lightning.constant.Constants;

/**
 * @author Stefano Pacifici
 * @date 2016/01/14
 */
public class TelemetrySender implements Runnable {
    private static final String TAG = TelemetrySender.class.getSimpleName();
    private static final String HEADER_CONTENT_TYPE = "Content-Type";
    private static final String TYPE_JSON = "application/json";

    private final JSONArray cache;
    private final Context context;

    public TelemetrySender(JSONArray cache, Context context) {
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
                reader = new BufferedReader(new FileReader(file));
                final String content = reader.readLine();
                pushTelemetry(content);
                safeClose(reader);
                file.delete();
            } catch (Exception e) {
                Log.e(Constants.TAG, "Failed to post telemetry to server", e);
            } finally {
                safeClose(reader);
            }
        }
    }

    private void pushTelemetry(String content) throws JSONException, IOException {
        URL url = new URL("https://logging.cliqz.com");
        HttpURLConnection httpURLConnection = (HttpURLConnection) url.openConnection();
        httpURLConnection.setRequestMethod("POST");
        httpURLConnection.setDoOutput(true);
        httpURLConnection.setUseCaches(false);
        httpURLConnection.setConnectTimeout(10000);
        httpURLConnection.setReadTimeout(10000);
        httpURLConnection.setRequestProperty(HEADER_CONTENT_TYPE, TYPE_JSON);
        //TODO uncomment when decompression implemented in server
        // httpURLConnection.setRequestProperty(HEADER_CONTENT_ENCODING, ENCODING_GZIP);
        httpURLConnection.connect();
        DataOutputStream dataOutputStream = new DataOutputStream(httpURLConnection.getOutputStream());
        dataOutputStream.writeBytes(content);
        dataOutputStream.close();
        int responseCode = httpURLConnection.getResponseCode();
        String responseMessage = "";
        if(responseCode == 200) {
            DataInputStream dataInputStream = new DataInputStream(httpURLConnection.getInputStream());
            BufferedReader lines = new BufferedReader(new InputStreamReader(dataInputStream, "UTF-8"));
            while (true) {
                String line = lines.readLine();
                if(line == null) {
                    break;
                } else {
                    responseMessage+=line;
                }
            }
            JSONObject response = new JSONObject(responseMessage);
            if(response.has("new_session")) {
                BrowserApp.getAppComponent().getPreferenceManager().setSessionId(response.getString("new_session"));
            }
        } else {
            throw new RuntimeException("Failed");
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
