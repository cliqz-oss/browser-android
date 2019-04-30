package com.cliqz.browser.controlcenter;

import android.view.View;

public interface ControlCenterActions {

    void hideControlCenter();

    void toggleControlCenter();

    void setControlCenterData(View source, boolean isIncognito, int hashCode,
                              String url);
}
