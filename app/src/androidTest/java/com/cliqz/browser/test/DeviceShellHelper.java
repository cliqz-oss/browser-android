package com.cliqz.browser.test;

import android.util.Log;

import java.util.concurrent.TimeUnit;

public class DeviceShellHelper {

    public static void mkdir(String dir) {
        try {
            Runtime.getRuntime().exec("mkdir -P " + dir);
        } catch (Exception e) {
            Log.e("AUTOBOTS", "Error Creating Directory: " + dir + ". " + e.getMessage());
        }
    }

    public static Process recordVideo(String filename) {
        try {
            String dir = "/mnt/sdcard/Movies";
            // mkdir(dir);
            return Runtime.getRuntime().exec(
                    String.format("screenrecord %s/%s.mp4", dir, filename));
        } catch (Exception e) {
            Log.e("AUTOBOTS", "Error starting Video Recording: " + e.getMessage());
            return null;
        }
    }
}
