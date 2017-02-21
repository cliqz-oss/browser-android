package com.cliqz.browser.controlcenter;

import android.app.Dialog;
import android.content.res.Configuration;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.design.widget.TabLayout;
import android.support.v4.app.DialogFragment;
import android.support.v4.view.ViewPager;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * Created by Ravjit on 22/11/16.
 */

public class ControlCenterDialog extends DialogFragment {

    private static String TAG = ControlCenterDialog.class.getSimpleName();

    private static final String KEY_ANCHOR_HEIGHT = TAG + ".ANCHOR_HEIGHT";
    private static final String KEY_HASHCODE = TAG + ".HASHCODE";
    private static final String KEY_URL = TAG + ".URL";

    private int mAnchorHeight;
    private int mHashCode;
    private String mUrl;

    @Bind(R.id.sec_features)
    TabLayout controlCenterHeaders;

    @Bind(R.id.control_center_pager)
    ViewPager controlCenterPager;

    @Inject
    Bus bus;

    public static ControlCenterDialog create(View source, int hashCode, String url) {
        final ControlCenterDialog dialog = new ControlCenterDialog();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_ANCHOR_HEIGHT, source.getHeight());
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        dialog.setArguments(arguments);
        return dialog;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(STYLE_NO_TITLE, R.style.ControlCenterStyle);
        BrowserApp.getActivityComponent(getActivity()).inject(this);
        final Bundle arguments = getArguments();
        mAnchorHeight = arguments.getInt(KEY_ANCHOR_HEIGHT, 0);
        mHashCode = arguments.getInt(KEY_HASHCODE, 0);
        mUrl = arguments.getString(KEY_URL);
    }

    @Override
    public void onResume() {
        super.onResume();
        bus.register(this);
        final DisplayMetrics metrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(metrics);
        final int height = metrics.heightPixels;
        final int resource = getContext().getResources().getIdentifier("status_bar_height", "dimen", "android");
        final int statusBarHeight = getContext().getResources().getDimensionPixelSize(resource);
        getDialog().getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, height - mAnchorHeight - statusBarHeight);
        getDialog().getWindow().setGravity(Gravity.BOTTOM);
    }

    @Override
    public void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.control_centre_layout, container, false);
        ButterKnife.bind(this, view);
        final ControlCenterAdapter controlCenterAdapter = new ControlCenterAdapter(getChildFragmentManager(),
                false, mHashCode, mUrl);
        controlCenterPager.setAdapter(controlCenterAdapter);
        controlCenterHeaders.setupWithViewPager(controlCenterPager);
        setStyle(STYLE_NO_TITLE, R.style.ControlCenterStyle);
        return view;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        dismiss();
        show(getFragmentManager(), Constants.CONTROL_CENTER);
    }

    @Subscribe
    public void dismissControlCenter(Messages.DismissControlCenter event) {
        dismiss();
    }

}
