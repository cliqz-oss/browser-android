package com.cliqz.browser.controlcenter;

import android.app.Activity;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.Button;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.DialogFragment;
import androidx.fragment.app.FragmentManager;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.extensions.ViewExtensionsKt;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.EngineNotYetAvailable;
import com.cliqz.jsengine.Insights;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.google.android.material.tabs.TabLayout;

import javax.inject.Inject;

import acr.browser.lightning.constant.Constants;
import acr.browser.lightning.preference.PreferenceManager;
import butterknife.BindView;
import butterknife.ButterKnife;

public class ControlCenterDialog extends DialogFragment {

    private static String TAG = ControlCenterDialog.class.getSimpleName();

    private static final String KEY_ANCHOR_HEIGHT = TAG + ".ANCHOR_HEIGHT";

    private boolean mSaveInstanceStateCalled = false;
    private int mAnchorHeight;

    private ControlCenterPagerAdapter mControlCenterPagerAdapter;

    @BindView(R.id.control_center_pager)
    ControlCenterViewPager controlCenterPager;

    @BindView(R.id.ultimate_protection_switch)
    SwitchCompat ultimateProtectionSwitch;

    @BindView(R.id.subscribe_ultimate_protection)
    View subscribeUltimateProtectionView;

    @BindView(R.id.ultimate_protection_container)
    View ultimateProtectionContainer;

    @BindView(R.id.control_center_tab_layout)
    TabLayout controlCenterTabLayout;

    @BindView(R.id.subscribe_ultimate_protection_btn)
    Button subscribeUltimateProtectionBtn;

    @Inject
    AntiTracking antiTracking;

    @Inject
    Adblocker adblocker;

    @Inject
    Bus bus;

    @Inject
    Insights insights;

    @Inject
    PurchasesManager purchasesManager;

    @Inject
    PreferenceManager preferenceManager;

    public static ControlCenterDialog create(View source) {
        final ControlCenterDialog dialog = new ControlCenterDialog();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_ANCHOR_HEIGHT, source.getHeight());
        dialog.setArguments(arguments);
        return dialog;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setStyle(STYLE_NO_TITLE, R.style.Theme_ControlCenter_Dialog);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        bus.register(this);

        final Bundle arguments = getArguments();
        if (arguments != null) {
            mAnchorHeight = arguments.getInt(KEY_ANCHOR_HEIGHT, 0);
        }
    }


    @Override
    public void onResume() {
        super.onResume();
        mSaveInstanceStateCalled = false;
        final Window window = getDialog().getWindow();
        final Activity activity = getActivity();
        final View contentView = activity != null ? activity.findViewById(android.R.id.content) : null;

        if (window != null && contentView != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, contentView.getHeight() - mAnchorHeight);
            window.setGravity(Gravity.BOTTOM);
        }
    }

    @Override
    public void onSaveInstanceState(@NonNull Bundle outState) {
        mSaveInstanceStateCalled = true;
        super.onSaveInstanceState(outState);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final Context context = getContext();
        final View view = LayoutInflater.from(context).inflate(R.layout.control_center_layout,
                container, false);
        ButterKnife.bind(this, view);

        mControlCenterPagerAdapter = new ControlCenterPagerAdapter(getChildFragmentManager(), context);
        mControlCenterPagerAdapter.init();
        controlCenterPager.setAdapter(mControlCenterPagerAdapter);
        controlCenterTabLayout.setupWithViewPager(controlCenterPager);

        hideSubscribeButton(purchasesManager.isDashboardEnabled());

        ultimateProtectionSwitch.setOnCheckedChangeListener((compoundButton, isChecked) -> {
            mControlCenterPagerAdapter.updateViewComponent(0, isChecked);
            mControlCenterPagerAdapter.updateViewComponent(1, isChecked);
            toggleTabLayout(isChecked);
            try {
                adblocker.setEnabled(isChecked);
                antiTracking.setEnabled(isChecked);
                preferenceManager.setAttrackEnabled(isChecked);
                preferenceManager.setAdBlockEnabled(isChecked);
                bus.post(new Messages.onDashboardStateChange());
            } catch (EngineNotYetAvailable engineNotYetAvailable) {
                Log.e("JsEngineError", "Cannot enable/disable tracking modules",
                        engineNotYetAvailable);
            }
        });

        setStyle(STYLE_NO_TITLE, R.style.Theme_ControlCenter_Dialog);
        return view;
    }

    @Subscribe
    void clearDashboardData(Messages.ClearDashboardData clearDashboardData) {
        insights.clearData();
        updateUI();
    }

    @Subscribe
    void onPurchaseCompleted(Messages.PurchaseCompleted purchaseCompleted) {
        hideSubscribeButton(purchasesManager.isDashboardEnabled());
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

    private void hideSubscribeButton(boolean isDashboardEnabled) {
        toggleTabLayout(isDashboardEnabled &&
                preferenceManager.isAttrackEnabled() && preferenceManager.getAdBlockEnabled());
        ultimateProtectionSwitch.setChecked(preferenceManager.isAttrackEnabled() &&
                preferenceManager.getAdBlockEnabled());
        subscribeUltimateProtectionView.setVisibility(isDashboardEnabled ? View.GONE : View.VISIBLE);
        ultimateProtectionContainer.setVisibility(isDashboardEnabled ? View.VISIBLE : View.GONE);
        ViewExtensionsKt.enableViewHierarchy(ultimateProtectionContainer, isDashboardEnabled);
        ViewExtensionsKt.enableViewHierarchy(controlCenterTabLayout, isDashboardEnabled);
        controlCenterPager.isPagingEnabled = isDashboardEnabled;
        if (!isDashboardEnabled) {
            subscribeUltimateProtectionBtn.setOnClickListener(view ->
                    bus.post(new Messages.GoToPurchase(0))
            );
        }
    }

    private void toggleTabLayout(boolean isEnabled) {
        final Context context = getContext();
        if (isEnabled) {
            controlCenterTabLayout.setSelectedTabIndicatorColor(
                    ContextCompat.getColor(context, R.color.bond_general_color_blue));
            controlCenterTabLayout.setTabTextColors(
                    ContextCompat.getColor(context, R.color.bond_disabled_text_color),
                    ContextCompat.getColor(context, R.color.bond_general_color_blue));
        } else {
            controlCenterTabLayout.setSelectedTabIndicatorColor(
                    ContextCompat.getColor(context, R.color.lumen_color_grey_text));
            controlCenterTabLayout.setTabTextColors(
                    ContextCompat.getColor(context, R.color.lumen_color_grey_text),
                    ContextCompat.getColor(context, R.color.lumen_color_grey_text));
        }
    }

    private void updateUI() {
        for (DashboardFragment fragment : mControlCenterPagerAdapter.mFragmentList) {
            fragment.updateUI();
        }
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    void dismissControlCenter(Messages.DismissControlCenter event) {
        dismissAllowingStateLoss();
    }
}
