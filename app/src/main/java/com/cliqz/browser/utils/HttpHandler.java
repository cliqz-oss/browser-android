package com.cliqz.browser.utils;

import android.support.annotation.Nullable;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * @author Khaled Tantawy
 */

public class HttpHandler {

    private static final String HEADER_CONTENT_TYPE = "Content-Type";

    private static final String TAG = HttpHandler.class.getSimpleName();


    @Nullable
    public static JSONObject sendRequest(String method, URL url, String contentType, String content) {
        HttpURLConnection httpURLConnection;
        try {
            httpURLConnection = (HttpURLConnection) url.openConnection();
            httpURLConnection.setRequestMethod(method);
            httpURLConnection.setUseCaches(method.equalsIgnoreCase("GET"));
            httpURLConnection.setConnectTimeout(10000);
            httpURLConnection.setReadTimeout(10000);
            httpURLConnection.setRequestProperty(HEADER_CONTENT_TYPE, contentType);
            //TODO uncomment when decompression implemented in server
            if (content != null) {
                DataOutputStream dataOutputStream = new DataOutputStream(httpURLConnection.getOutputStream());
                dataOutputStream.writeBytes(content);
                dataOutputStream.close();
            }
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
                        responseMessage += line;
                    }
                }
                return new JSONObject(responseMessage);
            } else {
                throw new RuntimeException("Response code not 200");
            }
        } catch (IOException e) {
            Log.e(TAG, "Error fetching request" + url.toString(), e);
        } catch (JSONException e) {
            Log.e(TAG, "Error parsing response" + url.toString(), e);
        } catch (RuntimeException e) {
            Log.e(TAG, "Error getting data from server" + url.toString(), e);
        }
        return null;
    }
}
