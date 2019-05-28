package com.cliqz.browser.utils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.util.Log;

import com.cliqz.utils.StreamUtils;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;

/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class HttpHandler {

    private static final String HEADER_CONTENT_TYPE = "Content-Type";

    private static final String TAG = HttpHandler.class.getSimpleName();
    private static final String HTTP_METHOD_GET = "GET";
    private static final int HTTP_CONNECT_TIMEOUT = 10000; // ms
    private static final int HTTP_READ_TIMEOUT = HTTP_CONNECT_TIMEOUT;

    @Nullable
    public static JSONObject sendRequest(   @NonNull String method,
                                            @NonNull URL url,
                                            @Nullable String contentType,
                                            @Nullable String content) {
        HttpURLConnection connection = null;
        try {
            connection = openConnection(url);
            connection.setRequestMethod(method.toUpperCase());
            connection.setUseCaches(HTTP_METHOD_GET.equalsIgnoreCase(method));
            connection.setConnectTimeout(HTTP_CONNECT_TIMEOUT);
            connection.setReadTimeout(HTTP_READ_TIMEOUT);
            if (content != null && contentType != null) {
                connection.setRequestProperty(HEADER_CONTENT_TYPE, contentType);
                sendContent(connection, content);
            }
            final String response = readResponse(connection);
            return response != null ? new JSONObject(response) : null;
        } catch (OpenConnectionException e) {
            Log.i(TAG, "Can't connect to " + url.toString(), e.getCause());
            return null;
        } catch (ProtocolException e) {
            Log.i(TAG, "Invalid request method " + method, e);
            return null;
        } catch (SendContentException e) {
            Log.i(TAG, "Can't send content to the server", e.getCause());
            return null;
        } catch (JSONException e) {
            Log.i(TAG, "Response is not a valid json", e);
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    @Nullable
    private static String readResponse(@NonNull HttpURLConnection connection) {
        int responseCode = -1;
        try {
            responseCode = connection.getResponseCode();
        } catch (IOException e) {
            Log.i(TAG, "Invalid server response", e);
        }

        if (responseCode != HttpURLConnection.HTTP_OK) {
            Log.i(TAG, "Invalid server response code " + responseCode);
            return null;
        }

        String response;
        try {
            final InputStream stream = connection.getInputStream();
            response = StreamUtils.readTextStream(stream);
            stream.close();
        } catch (IOException e) {
            Log.i(TAG, "Error reading server response", e);
            return null;
        }
        return response;
    }

    private static void sendContent(@NonNull HttpURLConnection connection,
                                    @NonNull String content) throws SendContentException {
        OutputStream outputStream;
        try {
            outputStream = connection.getOutputStream();
            outputStream.write(content.getBytes());
            outputStream.close();
        } catch (IOException e) {
            throw new SendContentException(e);
        }
    }

    private static HttpURLConnection openConnection(@NonNull URL url) throws OpenConnectionException {
        try {
            return (HttpURLConnection) url.openConnection();
        } catch (IOException e) {
            throw new OpenConnectionException(e);
        }
    }

    private static class OpenConnectionException extends Exception {
        OpenConnectionException(Exception e) { super(e); }
    }

    private static class SendContentException extends Exception {
        SendContentException(Exception e) { super(e); }
    }
}
