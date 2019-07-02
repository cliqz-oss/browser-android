package com.cliqz.browser.vpn;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Paint;
import android.graphics.drawable.RotateDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.LinearInterpolator;
import android.widget.Chronometer;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.DrawableRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.DialogFragment;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.extensions.DrawableExtensionsKt;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import java.util.ArrayList;
import java.util.Collection;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;
import de.blinkt.openvpn.VpnProfile;
import de.blinkt.openvpn.core.ConnectionStatus;
import de.blinkt.openvpn.core.ProfileManager;
import de.blinkt.openvpn.core.VpnStatus;

/**
 * @author Ravjit Uppal
 */
public class VpnPanel extends DialogFragment implements VpnStatus.StateListener {

    private static String TAG = VpnPanel.class.getSimpleName();

    private static final String KEY_ANCHOR_HEIGHT = TAG + ".ANCHOR_HEIGHT";

    public static final int VPN_LAUNCH_REQUEST_CODE = 70;

    private int mAnchorHeight;
    private boolean mSaveInstanceStateCalled = false;

    private Handler mMainHandler;
    private boolean mShouldAnimate = false;
    private int checkedItem = 0;
    private VpnProfile selectedProfile;

    @BindView(R.id.vpn_country)
    TextView mSelectedCountry;

    @BindView(R.id.vpn_connect_button)
    View mVpnConnectButton;

    @BindView(R.id.vpn_button_text_title)
    TextView mVpnButtonTitle;

    @BindView(R.id.vpn_button_text_desc)
    TextView mVpnButtonDesc;

    @BindView(R.id.vpn_map)
    ImageView mWorldMap;

    @BindView(R.id.vpn_timer)
    Chronometer mVpnTimer;

    @BindView(R.id.vpn_msg_line_one)
    TextView mVpnMsgLineOne;

    @BindView(R.id.vpn_msg_line_two)
    TextView mVpnMsgLineTwo;

    @BindView(R.id.vpn_cta_title)
    TextView mVpnCtaTitle;

    @Inject
    PurchasesManager purchasesManager;

    @Inject
    Bus bus;

    @Inject
    PreferenceManager preferenceManager;

    @Inject
    VpnHandler vpnHandler;

    public static VpnPanel create(View source) {
        final VpnPanel dialog = new VpnPanel();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_ANCHOR_HEIGHT, source.getHeight());
        dialog.setArguments(arguments);
        final Collection<VpnProfile> vpnProfiles =
                ProfileManager.getInstance(source.getContext()).getProfiles();
        if (vpnProfiles != null && !vpnProfiles.isEmpty()) {
            dialog.selectedProfile = vpnProfiles.iterator().next();
        }
        return dialog;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        super.onCreate(savedInstanceState);
        setStyle(STYLE_NO_TITLE, R.style.Theme_ControlCenter_Dialog);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        final Bundle arguments = getArguments();
        if (arguments != null) {
            mAnchorHeight = arguments.getInt(KEY_ANCHOR_HEIGHT, 0);
        }
        bus.register(this);
    }

    @Override
    public void onResume() {
        super.onResume();
        vpnHandler.onResume();
        mSaveInstanceStateCalled = false;
        final Window window = getDialog().getWindow();
        final Activity activity = getActivity();
        final View contentView = activity != null ? activity.findViewById(android.R.id.content) : null;

        if (window != null && contentView != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, contentView.getHeight() - mAnchorHeight);
            window.setGravity(Gravity.BOTTOM);
        }
        if (VpnStatus.isVPNConnected()) {
            updateStateToConnected();
        } else {
            updateStateToConnect();
        }
        VpnStatus.addStateListener(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        vpnHandler.onPause();
        VpnStatus.removeStateListener(this);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);
        ButterKnife.bind(this, view);
        if (selectedProfile == null) {
            mSelectedCountry.setText("US");
        } else {
            mSelectedCountry.setText(selectedProfile.getName());
        }
        mSelectedCountry.setPaintFlags(mSelectedCountry.getPaintFlags() | Paint.UNDERLINE_TEXT_FLAG);

        vpnMsgsChangeDrawable(VpnStatus.isVPNConnected() ? R.drawable.ic_check : R.drawable.ic_cross);

        mVpnCtaTitle.setText(purchasesManager.isVpnEnabled() ?
                getString(R.string.vpn_cta_enabled) : getString(R.string.vpn_cta_disabled));

        mMainHandler = new Handler(getContext().getMainLooper());
        final Window window = getDialog().getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL);
        getDialog().setCanceledOnTouchOutside(false);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.home_vpn_panel, container, false);
    }


    @OnClick(R.id.vpn_country)
    void vpnCountryClicked() {
        if (selectedProfile != null) {
            showVpnCountriesDialog();
        } else {
            unlockVpnDialog();
        }
    }

    @OnClick(R.id.vpn_connect_button)
    void connectClicked() {
        if (purchasesManager.isVpnEnabled()) {
            if (VpnStatus.isVPNConnected() || VpnStatus.isVPNConnecting()) {
                vpnHandler.disconnectVpn();
                updateStateToConnect();
            } else {
                vpnHandler.connectVpn(selectedProfile);
            }
        } else {
            unlockVpnDialog();
        }
    }

    @OnClick(R.id.learn_more_btn)
    void learnMoreClicked() {
        if (purchasesManager.isVpnEnabled()) {
            bus.post(CliqzMessages.OpenLink.open(getString(R.string.vpn_faq_url)));
            dismiss();
        } else {
            bus.post(new Messages.GoToPurchase(0));
        }
    }

    private void showVpnCountriesDialog() {
        final AlertDialog.Builder mBuilder = new AlertDialog.Builder(getContext());
        final ArrayList<VpnProfile> vpnProfiles = new ArrayList<>(ProfileManager.getInstance(getContext()).getProfiles());
        final String[] vpnCountryNames = new String[vpnProfiles.size()];
        for (int i = 0; i < vpnProfiles.size();  i++) {
            vpnCountryNames[i] = vpnProfiles.get(i).getName();
        }
        mBuilder.setTitle("Choose an item");
        mBuilder.setSingleChoiceItems(vpnCountryNames, checkedItem, (dialogInterface, i) -> {
            checkedItem =  i;
            selectedProfile = vpnProfiles.get(i);
            mSelectedCountry.setText(selectedProfile.getName());
            dialogInterface.dismiss();
            vpnHandler.disconnectVpn();
            vpnHandler.connectVpn(selectedProfile);
        });
        mBuilder.show();
    }    

    private void unlockVpnDialog() {
        new AlertDialog.Builder(getContext())
                .setTitle(getString(R.string.unlock_vpn_dialog_title))
                .setMessage(getString(R.string.unlock_vpn_dialog_description))
                .setNegativeButton(getString(R.string.unlock_vpn_dialog_negative_btn), null)
                .setPositiveButton(getString(R.string.unlock_vpn_dialog_positive_btn),
                        (dialogInterface, which) -> bus.post(new Messages.GoToPurchase(0)))
                .create()
                .show();
    }

    @Override
    public void updateState(String state, String logmessage, int localizedResId, ConnectionStatus level) {
        if (isAdded()) {
            if (level.equals(ConnectionStatus.LEVEL_START)) {
                if (mMainHandler != null) {
                    mMainHandler.post(mConnectingRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_CONNECTED)) {
                mShouldAnimate = false;
                if (mMainHandler != null) {
                    mMainHandler.post(mConnectedRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_NOTCONNECTED)) {
                if (mMainHandler != null) {
                    mMainHandler.post(mConnectRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_CONNECTING_SERVER_REPLIED)) {
                preferenceManager.setVpnStartTime(System.currentTimeMillis());
            }
        }
        bus.post(new Messages.onVpnStateChange());
    }

    @Override
    public void setConnectedVPN(String uuid) {
    }

    private final Runnable mConnectingRunnable = this::updateStateToConnecting;

    private final Runnable mConnectedRunnable = this::updateStateToConnected;

    private final Runnable mConnectRunnable = this::updateStateToConnect;

    private void animateTv() {
        final String[] dots = {".", "..", "...", "....",".....","......"};
        new Thread(() -> {
            int itr = 0;
            while (mShouldAnimate) {
                final int i = itr;
                itr++;
                mVpnButtonTitle.post(() -> mVpnButtonTitle.setText(dots[i%6]));
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    e.printStackTrace();
                }
            }
        }).start();
    }

    private void updateStateToConnecting() {
        mShouldAnimate = true;
        animateTv();
        mVpnTimer.stop();
        mVpnTimer.setVisibility(View.GONE);
        mVpnButtonDesc.setText("");
        mWorldMap.setImageResource(R.drawable.vpn_map_off);
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_button_connecting_animation));
        final RotateDrawable drawable = (RotateDrawable)mVpnConnectButton.getBackground();
        final ObjectAnimator animator = ObjectAnimator.ofInt(drawable, "level", 0, 10000);
        animator.setInterpolator(new LinearInterpolator());
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setDuration(800);
        animator.start();
    }

    private void updateStateToConnected() {
        mShouldAnimate = false;
        mVpnButtonTitle.setVisibility(View.GONE);
        mVpnTimer.setVisibility(View.VISIBLE);
        mVpnTimer.setBase(SystemClock.elapsedRealtime() - (System.currentTimeMillis() - preferenceManager.getVpnStartTime()));
        mVpnTimer.start();
        mVpnButtonDesc.setText("disconnect");
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_connect_button_bg));
        mWorldMap.setImageResource(R.drawable.vpn_map_on);
        vpnMsgsChangeDrawable(R.drawable.ic_check);
    }

    private void updateStateToConnect() {
        mShouldAnimate = false;
        mVpnTimer.stop();
        mVpnTimer.setVisibility(View.GONE);
        mVpnButtonTitle.setVisibility(View.VISIBLE);
        mVpnButtonTitle.setText("vpn");
        mVpnButtonDesc.setText("connect");
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_connect_button_bg));
        mWorldMap.setImageResource(R.drawable.vpn_map_off);
        vpnMsgsChangeDrawable(R.drawable.ic_cross);
    }

    @Subscribe
    public void onVpnPermissionGranted(Messages.OnVpnPermissionGranted onVpnPermissionGranted) {
        vpnHandler.connectVpn(selectedProfile);
    }

    private void vpnMsgsChangeDrawable(@DrawableRes int id) {
        DrawableExtensionsKt.drawableStart(mVpnMsgLineOne, id);
        DrawableExtensionsKt.drawableStart(mVpnMsgLineTwo, id);
    }

    @Subscribe
    void dismissVpnPanel(Messages.DismissVpnPanel event) {
        dismissAllowingStateLoss();
    }
}