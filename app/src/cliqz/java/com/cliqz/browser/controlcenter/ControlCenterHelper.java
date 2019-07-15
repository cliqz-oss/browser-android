package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.fragment.app.FragmentManager;

import com.cliqz.browser.app.AppComponent;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;

/**
 * Copyright © Cliqz 2019
 */
public class ControlCenterHelper implements ControlCenterActions {

    private View mSource;
    private boolean mIsIncognito;
    private int mHashCode;
    private String mUrl;

    private final FragmentManager mFragmentManager;
    private ControlCenterDialog controlCenterDialog;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    public ControlCenterHelper(Context context, @NonNull FragmentManager fragmentManager) {
        this.mFragmentManager = fragmentManager;
        final FlavoredActivityComponent component = context != null ?
                BrowserApp.getActivityComponent(context) : null;
        if (component != null) {
            component.inject(this);
        }
        bus.register(this);
    }

    @Override
    public void hideControlCenter() {
        dismissControlCenter(new Messages.DismissControlCenter());
    }

    @Override
    public void toggleControlCenter() {
        controlCenterDialog = ControlCenterDialog
                .create(mSource, mIsIncognito, mHashCode, mUrl);
        controlCenterDialog.show(mFragmentManager, Constants.CONTROL_CENTER);
    }

    @Override
    public void setControlCenterData(View source, boolean isIncognito, int hashCode, String url) {
        mSource = source;
        mIsIncognito = isIncognito;
        mHashCode = hashCode;
        mUrl = url;
    }


    @SuppressWarnings("UnusedParameters")
    @Subscribe
    void dismissControlCenter(Messages.DismissControlCenter event) {
        if (controlCenterDialog != null) {
            controlCenterDialog.dismissAllowingStateLoss();
        }
    }
}
