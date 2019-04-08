package com.cliqz.browser.controlcenter;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.design.widget.TabLayout;
import android.support.v4.app.DialogFragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.view.ViewPager;
import android.support.v7.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 */
public class ControlCenterDialog extends DialogFragment {

    private static String TAG = ControlCenterDialog.class.getSimpleName();

    private static final String KEY_ANCHOR_HEIGHT = TAG + ".ANCHOR_HEIGHT";
    private static final String KEY_HASHCODE = TAG + ".HASHCODE";
    private static final String KEY_URL = TAG + ".URL";
    private static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";

    private static ControlCenterComponent sControlCenterComponent =
            BrowserApp.getAppComponent().plus(new ControlCenterModule());

    private int mAnchorHeight;
    private int mHashCode;
    private String mUrl;
    private boolean mSaveInstanceStateCalled = false;
    private boolean mIsIncognito;

    @Bind(R.id.sec_features)
    TabLayout controlCenterHeaders;

    @Bind(R.id.control_center_pager)
    ViewPager controlCenterPager;

    @Inject
    Bus bus;

    @Inject
    Telemetry telemetry;

    public static ControlCenterDialog create(View source, boolean isIncognito, int hashCode, String url) {
        final ControlCenterDialog dialog = new ControlCenterDialog();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_ANCHOR_HEIGHT, source.getHeight());
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        dialog.setArguments(arguments);
        return dialog;
    }

    static ControlCenterComponent getComponent() {
        if (sControlCenterComponent == null) {
            throw new RuntimeException("Null ControlCenterComponent, please create a " +
                    "ControlCenterDialog instance first");
        }
        return sControlCenterComponent;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(STYLE_NO_TITLE, R.style.Theme_ControlCenter_Dialog);
        final MainActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        final Bundle arguments = getArguments();
        if (arguments != null) {
            mAnchorHeight = arguments.getInt(KEY_ANCHOR_HEIGHT, 0);
            mHashCode = arguments.getInt(KEY_HASHCODE, 0);
            mUrl = arguments.getString(KEY_URL);
            mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        mSaveInstanceStateCalled = false;
        bus.register(this);
        final Window window = getDialog().getWindow();
        final Activity activity = getActivity();
        final View contentView = activity != null ? activity.findViewById(android.R.id.content) : null;

        if (window != null && contentView != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, contentView.getHeight() - mAnchorHeight);
            window.setGravity(Gravity.BOTTOM);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Override
    public void onSaveInstanceState(@NonNull Bundle outState) {
        mSaveInstanceStateCalled = true;
        super.onSaveInstanceState(outState);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, final ViewGroup container, Bundle savedInstanceState) {
        final ContextThemeWrapper themedContext;
        final Context context = inflater.getContext();
        if (mIsIncognito) {
            themedContext = new ContextThemeWrapper(context, R.style.Theme_ControlCenter_Dialog_Incognito);
        } else {
            themedContext = new ContextThemeWrapper(context, R.style.Theme_ControlCenter_Dialog);
        }
        final LayoutInflater themedInflater = LayoutInflater.from(themedContext);
        final View view = themedInflater.inflate(R.layout.control_center_layout, container, false);
        ButterKnife.bind(this, view);
        final ControlCenterAdapter controlCenterAdapter = new ControlCenterAdapter(getChildFragmentManager(),
                mIsIncognito, mHashCode, mUrl);
        controlCenterPager.setAdapter(controlCenterAdapter);
        controlCenterPager.addOnPageChangeListener(new ViewPager.OnPageChangeListener() {
            @Override
            public void onPageScrolled(int position, float positionOffset, int positionOffsetPixels) {

            }

            @Override
            public void onPageSelected(int position) {
                final String currentPage;
                switch (position) {
                    case 0:
                        currentPage = TelemetryKeys.ATTRACK;
                        break;
                    case 1:
                        currentPage = TelemetryKeys.ADBLOCK;
                        break;
                    case 2:
                        currentPage = TelemetryKeys.ATPHISH;
                        break;
                    default:
                        currentPage = TelemetryKeys.ATTRACK;
                }
                if (telemetry != null) {
                    telemetry.sendCCTabSignal(currentPage);
                }
            }

            @Override
            public void onPageScrollStateChanged(int state) {

            }
        });
        controlCenterHeaders.setupWithViewPager(controlCenterPager);
        setStyle(STYLE_NO_TITLE, R.style.Theme_ControlCenter_Dialog);
        return view;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        dismissAllowingStateLoss();
        final FragmentManager fragmentManager = getFragmentManager();
        if (!mSaveInstanceStateCalled && fragmentManager != null) {
            show(fragmentManager, Constants.CONTROL_CENTER);
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void dismissControlCenter(Messages.DismissControlCenter event) {
        dismissAllowingStateLoss();
    }

}
