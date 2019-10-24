package com.cliqz.browser.utils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.utils.StreamUtils;

import org.json.JSONException;
import org.json.JSONTokener;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.ProtocolException;
import java.net.URL;
import java.util.Map;

import timber.log.Timber;

/**
 * @author Khaled Tantawy
 * @author Stefano Pacifici
 */
public class HttpHandler {

    private static final String HEADER_CONTENT_TYPE = "Content-Type";

    private static final String HTTP_METHOD_GET = "GET";
    private static final int HTTP_CONNECT_TIMEOUT = 10000; // ms
    private static final int HTTP_READ_TIMEOUT = HTTP_CONNECT_TIMEOUT;

    @Nullable
    public static Object sendRequest(   @NonNull String method,
                                            @NonNull URL url,
                                            @Nullable String contentType,
                                            @Nullable Map<String, String> customHeaders,
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
                if (customHeaders != null) {
                    for (Map.Entry<String, String> customHeader : customHeaders.entrySet()) {
                        connection.setRequestProperty(customHeader.getKey(), customHeader.getValue());
                    }
                }
                sendContent(connection, content);
            }
            final String response = readResponse(connection);
            return response != null ? new JSONTokener(response).nextValue() : null;
        } catch (OpenConnectionException e) {
            Timber.i(e, "Can't connect to %s", url.toString());
            return null;
        } catch (ProtocolException e) {
            Timber.i(e, "Invalid request method %s", method);
            return null;
        } catch (SendContentException e) {
            Timber.i(e, "Can't send content to the server");
            return null;
        } catch (JSONException e) {
            Timber.i(e, "Response is not a valid json");
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
        } catch (Exception e) {
            Timber.i(e, "Invalid server response");
        }

        if (responseCode != HttpURLConnection.HTTP_OK) {
            Timber.i("Invalid server response code %s", responseCode);
            return null;
        }

        String response;
        try {
            final InputStream stream = connection.getInputStream();
            response = StreamUtils.readTextStream(stream);
            stream.close();
        } catch (Exception e) {
            Timber.i(e, "Error reading server response");
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
        } catch (Exception e) {
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
