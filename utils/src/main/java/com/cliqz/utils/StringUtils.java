package com.cliqz.utils;

import java.security.MessageDigest;

/**
 * @author Stefano Pacifici
 */
public final class StringUtils {

    private StringUtils() {}

    /**
     * Given a message (a string) will compute the hex representation of its MD5 hash.
     *
     * @param message a non-null string
     * @return the hexadecimal string representation of the message md5 hash
     * @throws MD5Exception if it can not calculate the md5 string
     */
    public static String calculateMD5(String message) throws MD5Exception {
        try {
            final MessageDigest md = MessageDigest.getInstance("MD5");
            md.reset();
            final byte[] digest = md.digest(message.getBytes());
            final byte[] hexDigest = new byte[digest.length * 2];
            for (int i = 0; i < digest.length; i++) {
                final byte high = (byte) ((digest[i] & 0xf0) >> 4);
                final byte low = (byte) (digest[i] & 0x0f);
                final int hi = i * 2;
                hexDigest[hi] = (byte) (high < 0x0a ? 0x30 + high : 0x57 + high);
                hexDigest[hi + 1] = (byte) (low < 0x0a ? 0x30 + low : 0x57 + low);
            }
            return new String(hexDigest);
        } catch (Throwable e) {
            // Rethrow the exception wrapper in the MD5Exception
            throw new MD5Exception(e);
        }
    }

    /**
     * Escape a string containing html text, useful if you need to pass an html page to a Javascript
     * callback. It does not check if the string contains html
     *
     * @param html a String supposed to contain html text, can be null
     * @return the escaped version of the input string
     */
    public static String escapeHTML(String html) {
        if (html == null) {
            return "";
        }

        final StringBuilder builder = new StringBuilder(html.length() * 3 / 2);
        for (int i=0; i < html.length(); i++) {
            final char src = html.charAt(i);
            switch (src) {
                case '\\':
                    builder.append("\\\\");
                    break;
                case '\n':
                    builder.append("\\n");
                    break;
                case '"':
                    builder.append("\\\"");
                    break;
                default:
                    builder.append(src);
                    break;
            }
        }
        return builder.toString();
    }

    public static String encodeURLProperly(String url) {
        if (url == null) {
            return null;
        }
        try {
            final WebAddress webAddress = new WebAddress(url);
            final String path = webAddress.getPath();
            final StringBuilder builder = new StringBuilder();
            // hello/world\this|is a"test
            for (char c: path.toCharArray()) {
                switch (c) {
                    case '[':
                        builder.append("%5B");
                        break;
                    case ']':
                        builder.append("%5D");
                        break;
                    case '|':
                        builder.append("%7C");
                        break;
                    case ' ':
                        builder.append("%20");
                        break;
                    default:
                        builder.append(c);
                }
            }
            webAddress.setPath(builder.toString());
            return webAddress.toString();
        } catch (WebAddress.ParseException e) {
            return null;
        }
    }

    public static class MD5Exception extends Exception {
        MD5Exception(Throwable cause) {
            super("Can't calculate MD5 string", cause);
        }
    }
}
