package com.cliqz.browser.controlcenter;

import android.content.Context;

import androidx.fragment.app.Fragment;

/**
 * Copyright © Cliqz 2019
 */
public abstract class ControlCenterFragment extends Fragment {

    public abstract String getTitle(Context context, int position);

    public abstract void updateUI();

    public abstract void refreshUIComponent(boolean optionValue);
}
