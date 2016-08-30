package com.cliqz.utils;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

public final class StreamUtils {

    private StreamUtils() {}

    public static InputStream createEmptyStream() {
        return createStreamFromString("");
    }

    private static InputStream createStreamFromString(String str) {
        return new ByteArrayInputStream(str.getBytes());
    }
}
