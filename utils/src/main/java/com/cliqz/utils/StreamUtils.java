package com.cliqz.utils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;

public final class StreamUtils {

    private StreamUtils() {}

    public static InputStream createEmptyStream() {
        return createStreamFromString("");
    }

    private static InputStream createStreamFromString(String str) {
        return new ByteArrayInputStream(str.getBytes());
    }

    public static String readTextStream(InputStream in) {
        if (in == null) {
            return null;
        }

        final byte[] buffer = new byte[1024];
        final StringBuilder builder = new StringBuilder();
        int read;
        try {
            while ((read = in.read(buffer)) > 0) {
                //noinspection CharsetObjectCanBeUsed
                builder.append(new String(buffer, 0, read, "UTF-8"));
            }
            return builder.toString();
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }
}
