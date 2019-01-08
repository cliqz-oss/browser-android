package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.support.annotation.LayoutRes;
import android.support.annotation.Nullable;
import android.support.v4.content.ContextCompat;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.Messages.ControlCenterStatus;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.JSBridge;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.github.mikephil.charting.charts.PieChart;
import com.github.mikephil.charting.data.PieData;
import com.github.mikephil.charting.data.PieDataSet;
import com.github.mikephil.charting.data.PieEntry;
import com.github.mikephil.charting.listener.ChartTouchListener;
import com.github.mikephil.charting.listener.OnChartGestureListener;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

import javax.inject.Inject;

import acr.browser.lightning.preference.PreferenceManager;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */

public class TrackersOverviewFragment extends ControlCenterFragment {

    public static final String TAG = TrackersOverviewFragment.class.getSimpleName();

    private int mHashCode;
    private String mUrl;

    @Inject
    public Bus bus;

    @Inject
    public Telemetry telemetry;

    @Inject
    public AntiTracking attrack;

    @Inject
    PreferenceManager preferenceManager;

    @Bind(R.id.donut)
    PieChart donut;

    @Bind(R.id.website_name)
    TextView websiteName;

    @Bind(R.id.trackers_count)
    TextView trackersCount;

    @Bind(R.id.whitelist_button_wrapper)
    View whiteListButtonWrapper;

    @Bind(R.id.whitelist_button)
    Button whiteListButton;

    @Bind(R.id.attrack_shield)
    AppCompatImageView attrackShield;

    @Bind(R.id.blocked_or_activ)
    TextView blockedOrActive;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
        mHashCode = arguments.getInt(KEY_HASHCODE);
        mUrl = arguments.getString(KEY_URL);
    }

    @Override
    public void onResume() {
        super.onResume();
        bus.register(this);
        updateList();
    }

    @Override
    public void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Nullable
    @Override
    protected View onCreateThemedView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        //noinspection ConstantConditions
        ControlCenterDialog.getComponent().inject(this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.ghostery_attrack_layout; //use portrait unitl inci makes landscape design
                } else {
                    layout = R.layout.ghostery_attrack_layout;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.ghostery_attrack_layout; //use portrait unitl inci makes landscape design
                break;
            default:
                layout = R.layout.ghostery_attrack_layout;
                break;
        }
        final View view = inflater.inflate(layout, container, false);
        ButterKnife.bind(this, view);
        view.setAlpha(0.97f);
        final boolean isEnabled = !attrack.isWhitelisted(Uri.parse(mUrl).getHost());
        if (!preferenceManager.isAttrackEnabled()) {
            setGenerallyDisabled();
        } else {
            setEnabled(isEnabled);
        }
        return view;
    }

    private void setGenerallyDisabled() {
        setEnabled(false);
    }

    @Override
    protected void setEnabled(boolean isEnabled) {
        super.setEnabled(isEnabled);
        final ControlCenterStatus status =
                isEnabled ? ControlCenterStatus.ENABLED : ControlCenterStatus.DISABLED;
        if (isEnabled) {
            whiteListButtonWrapper.setBackground(ContextCompat.getDrawable(getContext(), R.drawable.trust_website_wrapper_bg));
            whiteListButton.setText(R.string.trust_site);
            whiteListButton.setTextColor(ContextCompat.getColor(getContext(), R.color.toolbar_icon_color_normal));
            attrackShield.setColorFilter(ContextCompat.getColor(getContext(), R.color.toolbar_icon_color_normal), PorterDuff.Mode.SRC_ATOP);
        } else {
            whiteListButtonWrapper.setBackground(ContextCompat.getDrawable(getContext(), R.drawable.block_trackers_wrapper_bg));
            whiteListButton.setText(R.string.block_trackers);
            whiteListButton.setTextColor(ContextCompat.getColor(getContext(), R.color.white));
            attrackShield.setColorFilter(ContextCompat.getColor(getContext(), R.color.white), PorterDuff.Mode.SRC_ATOP);
        }
        blockedOrActive.setText(R.string.found_on);
        bus.post(new Messages.UpdateControlCenterIcon(status));
    }

    @Subscribe
    public void updateList(Messages.UpdateAntiTrackingList event) {
        updateList();
    }

    private void updateList() {
        final List<PieEntry> entries = new ArrayList<>();
        final List<Integer> colors = new ArrayList<>();
        final List<Integer> redColors = new ArrayList<>();
        redColors.add(0, R.color.attrack_red_1);
        redColors.add(1, R.color.attrack_red_2);
        redColors.add(2, R.color.attrack_red_3);
        redColors.add(3, R.color.attrack_red_4);
        attrack.getTabThirdPartyInfo(mHashCode, new JSBridge.Callback() {
            @Override
            public void callback(ReadableMap result) {
                ReadableMap innerResult = result.getMap("result");
                final boolean isEnabled = !attrack.isWhitelisted(Uri.parse(mUrl).getHost());
                int appCount = 0;
                int blockedAppCount = 0;
                int redCounter = 0;
                for (ReadableMapKeySetIterator it = innerResult.keySetIterator(); it.hasNextKey(); ) {
                    String name = it.nextKey();
                    ReadableMap category = innerResult.getMap(name);

                    int blockedCount = 0;
                    int entryCount = 0;
                    for (ReadableMapKeySetIterator itt = category.keySetIterator(); itt.hasNextKey(); ) {
                        final String trackerName = itt.nextKey();
                        if (category.getBoolean(trackerName)) {
                            blockedCount++;
                        }
                        entryCount++;
                    }

                    entries.add(new PieEntry(entryCount * 1.0f));

                    // choose pie colour based on enabled state
                    if (isEnabled) {
                        colors.add(ContextCompat.getColor(getContext(), GhosteryCategories.safeValueOf(name).categoryColor));
                    } else {
                        colors.add(ContextCompat.getColor(getContext(), redColors.get(redCounter%4)));
                    }

                    redCounter++;

                    appCount += entryCount;
                    blockedAppCount += blockedCount;
                }
                final int badgeCount = appCount;

                new Handler(Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        bus.post(new Messages.ForceUpdateTrackerCount(badgeCount));
                    }
                });
                PieDataSet set = new PieDataSet(entries, "Clostery");
                set.setColors(colors);
                PieData data = new PieData(set);
                data.setDrawValues(false);
                donut.setHighlightPerTapEnabled(false);
                donut.setData(data);
                donut.setDrawEntryLabels(false);
                donut.setCenterText(Integer.toString(appCount));
                donut.setCenterTextSize(26);
                donut.setHoleRadius(70);
                donut.setDescription(null);
                donut.setDrawMarkers(false);
                donut.getLegend().setEnabled(false);
                donut.invalidate();
                trackersCount.setText(getResources().getString(R.string.control_center_tracker_ad_blocked, badgeCount));
                donut.setOnChartGestureListener(new OnChartGestureListener() {
                    @Override
                    public void onChartGestureStart(MotionEvent me, ChartTouchListener.ChartGesture lastPerformedGesture) {
                        //Do nothing
                    }

                    @Override
                    public void onChartGestureEnd(MotionEvent me, ChartTouchListener.ChartGesture lastPerformedGesture) {
                        //Do nothing
                    }

                    @Override
                    public void onChartLongPressed(MotionEvent me) {
                        //Do nothing
                    }

                    @Override
                    public void onChartDoubleTapped(MotionEvent me) {
                        //Do nothing
                    }

                    @Override
                    public void onChartSingleTapped(MotionEvent me) {
                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                bus.post(new Messages.SwitchToTrackerDetails());
                            }
                        });
                    }

                    @Override
                    public void onChartFling(MotionEvent me1, MotionEvent me2, float velocityX, float velocityY) {
                        //Do nothing
                    }

                    @Override
                    public void onChartScale(MotionEvent me, float scaleX, float scaleY) {
                        //Do nothing
                    }

                    @Override
                    public void onChartTranslate(MotionEvent me, float dX, float dY) {
                        //Do nothing
                    }
                });

            }
        });
        final String urlHostName;
        try {
            urlHostName = (new URL(mUrl)).getHost();
            websiteName.setText(urlHostName);
        } catch (MalformedURLException e) {
            e.printStackTrace();
            websiteName.setText(mUrl);
        }
    }

    public static TrackersOverviewFragment create(int hashCode, String url, boolean isIncognito) {
        final TrackersOverviewFragment fragment = new TrackersOverviewFragment();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }

    @OnClick(R.id.whitelist_button)
    void addToWhiteList(View view) {
        final boolean isEnabled = !attrack.isWhitelisted(Uri.parse(mUrl).getHost());
        if (isEnabled) {
            attrack.addDomainToWhitelist(Uri.parse(mUrl).getHost());
        } else {
            attrack.removeDomainFromWhitelist(Uri.parse(mUrl).getHost());
        }
        bus.post(new Messages.DismissControlCenter());
        bus.post(new Messages.ReloadPage());
    }
}
