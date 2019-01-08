package com.cliqz.browser.controlcenter;

/**
 * @author Ravjit Uppal
 */
class TrackerCompanyModel {

    String trackerName;
    boolean isBlocked;

    TrackerCompanyModel(String trackerName, boolean isBlocked) {
        this.trackerName = trackerName;
        this.isBlocked = isBlocked;
    }
}
