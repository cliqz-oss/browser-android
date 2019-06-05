package com.cliqz.browser.test;

import android.util.Log;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

public class DeviceShellHelper {

    public static void mkdir(String dir) {
        try {
            Process p = Runtime.getRuntime().exec("mkdir -p " + dir);
            logStream(p.getInputStream());
            logStream(p.getErrorStream());
        } catch (Exception e) {
            Log.e("AUTOBOTS", "Error Creating Directory: " + dir + ". " + e.getMessage());
        }
    }

    public static void logStream(InputStream stream) {
        try {
            BufferedReader buffer = new BufferedReader(new InputStreamReader(stream));
            StringBuilder log = new StringBuilder();
            String line;
            while ((line = buffer.readLine()) != null) {
                log.append(line + "\n");
            }
            Log.d("AUTOBOTS", log.toString());
        } catch (Exception e) {
            Log.e("AUTOBOTS", e.getMessage());
        }
    }

    public static Process recordVideo(String filename) {
        try {
            String dir = "/mnt/sdcard/videos";
            mkdir(dir);
            Process p = Runtime.getRuntime().exec(
                    String.format("screenrecord %s/%s.mp4", dir, filename));
            logStream(p.getInputStream());
            logStream(p.getErrorStream());
            return p;
        } catch (Exception e) {
            Log.e("AUTOBOTS", "Error starting Video Recording: " + e.getMessage());
            return null;
        }
    }

    public static void takeScreenshot(String filename) {
        try {
            String dir = "/mnt/sdcard/screenshots";
            mkdir(dir);
            Process p = Runtime.getRuntime().exec(
                    String.format("screencap %s/%s.png", dir, filename));
            logStream(p.getInputStream());
            logStream(p.getErrorStream());
        } catch (Exception e) {
            Log.e("AUTOBOTS", "Error taking Screenshot: " + e.getMessage());
        }
    }
}
