package com.cliqz.antitracking.test;

import java.util.Locale;
import java.util.TimerTask;

/**
 * @author Stefano Pacifici
 * @date 2016/07/14
 */
class Record {
    private static String FORMAT = "%s,%d,%d,%d,%d";

    long startTime = System.currentTimeMillis();
    long endTime = 0;
    String origUrl = null;
    int requests = 0;
    int overriddenRequests = 0;
    public String loadedUrl;

    @Override
    public String toString() {
        return String.format(Locale.US, FORMAT, origUrl, startTime, endTime, requests, overriddenRequests);
    }
}
