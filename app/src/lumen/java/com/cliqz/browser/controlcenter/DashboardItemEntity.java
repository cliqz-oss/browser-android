package com.cliqz.browser.controlcenter;

/**
 * Copyright © Cliqz 2019
 */
public class DashboardItemEntity {

    static final int VIEW_TYPE_SHIELD = 1;
    static final int VIEW_TYPE_ICON = 2;

    private String mMeasurementValue;
    private String mMeasurementUnit;
    private int mIconResId;
    private String mTitle;
    private int mOptionValue;
    private int mViewType;

    DashboardItemEntity(String measurementValue, String measurementUnit, int iconResId, String title, int optionValue, int viewType) {
        this.mMeasurementValue = measurementValue;
        this.mMeasurementUnit = measurementUnit;
        this.mIconResId = iconResId;
        this.mTitle = title;
        this.mOptionValue = optionValue;
        this.mViewType = viewType;
    }

    String getMeasurementValue() {
        return mMeasurementValue;
    }

    String getMeasurementUnit() {
        return mMeasurementUnit;
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

    public int getmViewType() {
        return mViewType;
    }
}
