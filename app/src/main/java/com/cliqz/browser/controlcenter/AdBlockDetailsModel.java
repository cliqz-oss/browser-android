package com.cliqz.browser.controlcenter;

/**
 * Created by Ravjit on 17/11/16.
 */

public class AdBlockDetailsModel {
    public final String companyName;
    public final int adBlockCount;

    public AdBlockDetailsModel(String companyName, int adBlockCount) {
        this.companyName = companyName;
        this.adBlockCount = adBlockCount;
    }
}
