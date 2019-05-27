package com.cliqz.browser.vpn;

import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.graphics.Paint;
import android.graphics.drawable.RotateDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.SystemClock;
import android.support.annotation.Nullable;
import android.support.v4.app.DialogFragment;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.animation.LinearInterpolator;
import android.widget.Chronometer;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.purchases.PurchasesManager;
import com.cliqz.library.vpn.core.ConnectionStatus;
import com.cliqz.library.vpn.core.VpnStatus;
import com.cliqz.nove.Bus;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;

/**
 * @author Ravjit Uppal
 */
public class VpnPanel extends DialogFragment implements View.OnClickListener, VpnStatus.StateListener {

    private static String TAG = VpnPanel.class.getSimpleName();

    private static final String KEY_ANCHOR_HEIGHT = TAG + ".ANCHOR_HEIGHT";

    private int mAnchorHeight;
    private boolean mSaveInstanceStateCalled = false;

    private TextView mSelectedCountry;
    private View mVpnConnectButton;
    private TextView mVpnButtonTitle;
    private TextView mVpnButtonDesc;
    private TextView mVpnStatusText;
    private ImageView mWorldMap;
    private Chronometer vpnTimer;
    private Handler mainHandler;
    private Boolean shouldAnimate = false;

    private VpnHandler mVpnHandler;

    @Inject
    PurchasesManager purchasesManager;

    @Inject
    Bus bus;

    @Inject
    PreferenceManager preferenceManager;

    public static VpnPanel create(View source, Activity activity) {
        final VpnPanel dialog = new VpnPanel();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_ANCHOR_HEIGHT, source.getHeight());
        dialog.setArguments(arguments);
        dialog.mVpnHandler = new VpnHandler(activity);
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
        if (VpnStatus.isVPNConnected()) {
            updateStateToConnected();
        } else {
            updateStateToConnect();
        }
        mVpnHandler.onResume();
        VpnStatus.addStateListener(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        VpnStatus.removeStateListener(this);
        mVpnHandler.onPause();
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.home_vpn_panel, container, false);
        mSelectedCountry = view.findViewById(R.id.vpn_country);
        //mSelectedCountry.setText(PreferenceManager.getInstance(getContext()).getVpnSelectedCountry());
        mSelectedCountry.setText("Wakanda");
        mSelectedCountry.setOnClickListener(this);
        mSelectedCountry.setPaintFlags(mSelectedCountry.getPaintFlags() |   Paint.UNDERLINE_TEXT_FLAG);
        mVpnConnectButton = view.findViewById(R.id.vpn_connect_button);
        mVpnConnectButton.setOnClickListener(this);
        mVpnButtonTitle = mVpnConnectButton.findViewById(R.id.vpn_button_text_title);
        mVpnButtonDesc = mVpnConnectButton.findViewById(R.id.vpn_button_text_desc);
        mVpnStatusText = view.findViewById(R.id.vpn_status_text);
        mWorldMap = view.findViewById(R.id.vpn_map);
        vpnTimer = view.findViewById(R.id.vpn_timer);
        mainHandler = new Handler(getContext().getMainLooper());
        return view;
    }

    @Override
    public void onClick(View v) {
        if (v.getId() == R.id.vpn_country) {
            //VpnCountriesDialog.show(getContext(), this);
            Toast.makeText(getContext(), "In progress", Toast.LENGTH_SHORT).show();
        } else if (v.getId() == R.id.vpn_connect_button) {
            if (!purchasesManager.isVpnEnabled()) {
                bus.post(new Messages.GoToPurchase(0));
                return;
            }
            if (VpnStatus.isVPNConnected() || VpnStatus.isVPNConnecting()) {
                mVpnHandler.disconnectVpn();
                updateStateToConnect();
            } else {
                mVpnHandler.connectVpn();
            }
        }
    }

    @Override
    public void updateState(String state, String logmessage, int localizedResId, ConnectionStatus level) {
        if (isAdded()) {
            if (level.equals(ConnectionStatus.LEVEL_START)) {
                if (mainHandler != null) {
                    mainHandler.post(mConnectingRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_CONNECTED)) {
                shouldAnimate = false;
                if (mainHandler != null) {
                    mainHandler.post(mConnectedRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_NOTCONNECTED)) {
                if (mainHandler != null) {
                    mainHandler.post(mConnectRunnable);
                }
            } else if (level.equals(ConnectionStatus.LEVEL_CONNECTING_SERVER_REPLIED)) {
                preferenceManager.setVpnStartTime(System.currentTimeMillis());
            }
        }
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
            while (shouldAnimate) {
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
        shouldAnimate = true;
        animateTv();
        vpnTimer.stop();
        vpnTimer.setVisibility(View.GONE);
        mVpnButtonDesc.setText("");
        mWorldMap.setImageResource(R.drawable.vpn_map_off);
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_button_connecting_animation));
        final RotateDrawable drawable = (RotateDrawable)mVpnConnectButton.getBackground();
        final ObjectAnimator animator = ObjectAnimator.ofInt(drawable, "level", 0, 10000);
        animator.setInterpolator(new LinearInterpolator());
        animator.setRepeatCount(ValueAnimator.INFINITE);
        animator.setDuration(800);
        animator.start();
        mVpnStatusText.setText("connecting");
    }

    private void updateStateToConnected() {
        shouldAnimate = false;
        mVpnButtonTitle.setVisibility(View.GONE);
        vpnTimer.setVisibility(View.VISIBLE);
        vpnTimer.setBase(SystemClock.elapsedRealtime() - (System.currentTimeMillis() - preferenceManager.getVpnStartTime()));
        vpnTimer.start();
        mVpnButtonDesc.setText("disconnect");
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_connect_button_bg));
        mWorldMap.setImageResource(R.drawable.vpn_map_on);
        mVpnStatusText.setText("connected");
    }

    private void updateStateToConnect() {
        shouldAnimate = false;
        vpnTimer.stop();
        vpnTimer.setVisibility(View.GONE);
        mVpnButtonTitle.setVisibility(View.VISIBLE);
        mVpnButtonTitle.setText("vpn");
        mVpnButtonDesc.setText("connect");
        mVpnConnectButton.setBackground(getResources().getDrawable(R.drawable.vpn_connect_button_bg));
        mWorldMap.setImageResource(R.drawable.vpn_map_off);
        mVpnStatusText.setText("connect");
    }
}