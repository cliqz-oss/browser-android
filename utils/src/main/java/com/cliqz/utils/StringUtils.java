package com.cliqz.utils;

import java.security.MessageDigest;
import java.util.regex.Pattern;

import io.mola.galimatias.GalimatiasParseException;
import io.mola.galimatias.ParseIssue;
import io.mola.galimatias.URL;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("JavadocReference")
public final class StringUtils {

    private final static Pattern URL_WITH_USERNAME_AND_PASSWORD_WITHOUT_SCHEME =
            Pattern.compile("([^/:@]*):([^/:@]*)@[^/]+.*");
    private final static Pattern URL_WITH_HOST_AND_PORT =
            Pattern.compile("[^/:]+:\\d+(/.*)?");

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

    /**
     * Given a string, this function tries to guess a valid url from it. This function was inspired
     * by {@link android.webkit.URLUtil#guessUrl(String)}.
     *
     * @param inUrl the string we want the url to be guessed from
     * @return a non null guessed url
     */
    public static String guessUrl(String inUrl) {
        String retVal = inUrl != null ? inUrl : "";
        URL webAddress;
        // if (TRACE) Log.v(LOGTAG, "guessURL before queueRequest: " + retVal);

        if (retVal.length() == 0) return retVal;
        if (retVal.startsWith("about:")) return retVal;
        // Do not try to interpret data scheme URLs
        if (retVal.startsWith("data:")) return retVal;
        // Do not try to interpret file scheme URLs
        if (retVal.startsWith("file:")) return retVal;
        // Do not try to interpret javascript scheme URLs
        if (retVal.startsWith("javascript:")) return retVal;
        // Do not try to interpret chrome scheme URLs
        if (retVal.startsWith("chrome:")) return retVal;
        // Do not try to interpret moz-extension scheme URLs
        if (retVal.startsWith("moz-extension:")) return retVal;
        // Do not try to interpret mailto scheme URLs
        if (retVal.startsWith("mailto")) return retVal;
        // Do not try to interpret view-source scheme URLs
        if (retVal.startsWith("view-source:")) return retVal;
        // Do not try to interpret resource scheme URLs
        if (retVal.startsWith("resource:")) return retVal;

        // Do not interpret localhost
        if ("localhost".equalsIgnoreCase(retVal)) return retVal;

        // Strip all periods and spaces from the tail
        while (retVal.endsWith(".") || retVal.endsWith(" ")) {
            retVal = retVal.substring(0, retVal.length() - 1);
        }

        try {
            webAddress = parseURL(retVal);
            // Check host
            if (webAddress.host() == null) {
                if (URL_WITH_USERNAME_AND_PASSWORD_WITHOUT_SCHEME.matcher(retVal).matches()) {
                    webAddress = parseURL("http://" + retVal);
                }
                if (URL_WITH_HOST_AND_PORT.matcher(retVal).matches()) {
                    return retVal; // I.E.: magrathea:8080
                }
            }
            final String hostStr = webAddress.host().toString();
            if (!"localhost".equalsIgnoreCase(hostStr) && !hostStr.contains(".")) {
                webAddress = webAddress.withHost("www." + hostStr + ".com");
            }
        } catch (GalimatiasParseException e) {
           return retVal;
        }

        return webAddress.toString();
    }

    private static URL parseURL(String inUrl) throws GalimatiasParseException {
        try {
            return URL.parse(inUrl);
        } catch (GalimatiasParseException e) {
            if (e.getParseIssue() == ParseIssue.MISSING_SCHEME) {
                return parseURL("http://" + inUrl);
            }
            throw e;
        }
    }

    public static class MD5Exception extends Exception {
        MD5Exception(Throwable cause) {
            super("Can't calculate MD5 string", cause);
        }
    }
}
