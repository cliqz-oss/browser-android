package com.cliqz.browser.controlcenter;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardItemEntity {
    private String mMeasurementValue;
    private String mMeasurementUnit;
    private int mIconResId;
    private String mTitle;
    private String mContent;
    private int mOptionValue;

    DashboardItemEntity(String measurementValue, String measurementUnit, int iconResId, String title, String content, int optionValue) {
        this.mMeasurementValue = measurementValue;
        this.mMeasurementUnit = measurementUnit;
        this.mIconResId = iconResId;
        this.mTitle = title;
        this.mContent = content;
        this.mOptionValue = optionValue;
    }

    String getMeasurementValue() {
        return mMeasurementValue;
    }

    public void setMeasurementValue(String measurementValue) {
        this.mMeasurementValue = measurementValue;
    }

    String getMeasurementUnit() {
        return mMeasurementUnit;
    }

    public void setMeasurementUnit(String measurementUnit) {
        this.mMeasurementUnit = measurementUnit;
    }

    int getIconResId() {
        return mIconResId;
    }

    public void setIconResId(int iconResId) {
        this.mIconResId = iconResId;
    }

    public String getTitle() {
        return mTitle;
    }

    public void setTitle(String title) {
        this.mTitle = title;
    }

    public String getContent() {
        return mContent;
    }

    public void setContent(String content) {
        this.mContent = content;
    }

    int getOptionValue() {
        return mOptionValue;
    }

    public void setOptionValue(int optionValue) {
        this.mOptionValue = optionValue;
    }
}
