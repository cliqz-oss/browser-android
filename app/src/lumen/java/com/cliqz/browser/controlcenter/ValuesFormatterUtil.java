package com.cliqz.browser.controlcenter;

import com.cliqz.browser.R;

/**
 * Copyright © Cliqz 2019
 *
 * Utility class to convert the dashboard values into appropriate units
 */
class ValuesFormatterUtil {

    /**
     * @param value time in milliseconds
     * @return Properly formatted time
     */
    static MeasurementWrapper formatTime(int value) {
        final int oneMinute = 60;
        final int oneHour = 60 * 60;
        final int oneDay = 24 * 60 * 60;
        final int days;
        final int hours;
        final int minutes;
        final int seconds;
        String dayString;
        String hourString;
        String minutesString;
        String secondsString;
        int timeInSeconds = (int) Math.ceil(value/1000d);
        if (timeInSeconds < 60) {
            secondsString = Integer.toString(timeInSeconds);
            return new MeasurementWrapper(secondsString, R.string.bond_dashboard_units_seconds);
        }
        if (timeInSeconds < oneHour) {
            minutes = timeInSeconds / 60;
            if (minutes > 0) {
                seconds = timeInSeconds % (minutes * 60);
            } else {
                seconds = timeInSeconds;
            }
            minutesString = Integer.toString(minutes);
            secondsString = Integer.toString(seconds);
            // append 0 if single digit
            if (minutes < 10) {
                minutesString = "0" + minutesString;
            }
            if (seconds < 10) {
                secondsString = "0" + secondsString;
            }
            return new MeasurementWrapper(minutesString + ":" + secondsString, R.string.bond_dashboard_units_minutes);
        }
        if (timeInSeconds < oneDay) {
            hours = timeInSeconds / (60 * 60);
            minutes = (timeInSeconds % (hours * 60 * 60)) / 60;
            hourString = Integer.toString(hours);
            minutesString = Integer.toString(minutes);
            //append 0 if single digit
            if (hours < 10) {
                hourString = "0" + hourString;
            }
            if (minutes < 10) {
                minutesString = "0" + minutesString;
            }
            return new MeasurementWrapper(hourString + ":" + minutesString, R.string.bond_dashboard_units_hours);
        }
        days = timeInSeconds / (24 * 60 * 60);
        dayString = Integer.toString(days);
        return new MeasurementWrapper(dayString, R.string.bond_dashboard_units_days);
    }

    static MeasurementWrapper formatBlockCount(int totalCount) {
        if (totalCount < 100000) {
            return new MeasurementWrapper(Integer.toString(totalCount), 0);
        } else {
            return new MeasurementWrapper("100k+", 0);
        }
    }

    static MeasurementWrapper formatBytesCount(int bytes) {
        final int kiloBytes = bytes / 1024;
        final int gigaBytes;
        final int megaBytes;
        String megaBytesString;
        String kiloBytesString;
        String gigaBytesString;
        if (kiloBytes < 1000) {
            kiloBytesString = Integer.toString(kiloBytes);
            return new MeasurementWrapper(kiloBytesString, R.string.bond_dashboard_units_kb);
        }
        if (kiloBytes < 1000 * 1000) {
            megaBytes = kiloBytes / 1000;
            megaBytesString = Integer.toString(megaBytes);
            return new MeasurementWrapper(megaBytesString, R.string.bond_dashboard_units_mb);
        }
        gigaBytes = kiloBytes / (1000 * 1000);
        gigaBytesString = Integer.toString(gigaBytes);
        return new MeasurementWrapper(gigaBytesString, R.string.bond_dashboard_units_gb);
    }
}