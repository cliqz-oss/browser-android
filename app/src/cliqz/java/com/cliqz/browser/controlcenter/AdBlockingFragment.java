package com.cliqz.browser.controlcenter;

import android.content.Context;
import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.LayoutRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatButton;
import androidx.appcompat.widget.AppCompatImageView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.jsengine.Adblocker;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import java.util.Objects;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.preference.PreferenceManager;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
public class AdBlockingFragment extends ControlCenterFragment implements CompoundButton.OnCheckedChangeListener {

    public static final String TAG = AdBlockingFragment.class.getSimpleName();

    private static final String adBlockingHelpUrlDe = "https://cliqz.com/whycliqz/adblocking";
    private static final String adBlockingHelpUrlEn = "https://cliqz.com/en/whycliqz/adblocking";
    private AdBlockListAdapter mAdapter;
    private String mUrl;
    private int mHashCode;

    @Inject
    public Bus bus;

    @Inject
    public Telemetry telemetry;

    @Inject
    public Adblocker adb;

    @Inject
    PreferenceManager preferenceManager;

    @BindView(R.id.counter)
    TextView counter;

    @BindView(R.id.trackers_list)
    RecyclerView trackersList;

    @BindView(R.id.button_ok)
    AppCompatButton helpButton;

    @BindView(R.id.companies_header)
    TextView companiesHeader;

    @BindView(R.id.counter_header)
    TextView counterHeader;

    @BindView(R.id.upperLine)
    View upperLine;

    @BindView(R.id.lowerLine)
    View lowerLine;

    @BindView(R.id.anti_tracking_table)
    View antitrackingTable;

    @BindView(R.id.adblock_enable)
    Switch enableAdBlock;

    @BindView(R.id.adblock_icon)
    AppCompatImageView adBlockIcon;

    @BindView(R.id.adblocking_header)
    TextView adblockHeader;

    @BindView(R.id.ads_blocked)
    TextView adsBlocked;

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

    @Override
    protected void parseArguments(@NonNull Bundle args) {
        mUrl = args.getString(ControlCenterFragment.KEY_URL);
        mHashCode = args.getInt(KEY_HASHCODE);
    }

    @Override
    protected View onCreateThemedView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        ControlCenterDialog.getComponent().inject(this);
        mAdapter = new AdBlockListAdapter(mIsIncognito, this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.ad_blocking_layout_land;
                } else {
                    layout = R.layout.ad_blocking_layout;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.ad_blocking_layout_land;
                break;
            default:
                layout = R.layout.ad_blocking_layout;
                break;
        }
        final View view = inflater.inflate(layout, container, false);
        ButterKnife.bind(this, view);
        view.setAlpha(0.97f);
        trackersList.setLayoutManager(new LinearLayoutManager(getContext()));
        trackersList.setAdapter(mAdapter);
        final boolean isEnabled = !adb.isBlacklisted(mUrl);
        enableAdBlock.setChecked(isEnabled);
        enableAdBlock.setText(Uri.parse(mUrl).getHost());
        enableAdBlock.setOnCheckedChangeListener(this);
        setEnabled(isEnabled);
        if (!preferenceManager.getAdBlockEnabled()) {
            setAdBlockGloballyDisabledView();
        }
        return view;
    }

    private void setAdBlockGloballyDisabledView() {
        super.setEnabled(false);
        adblockHeader.setText(getString(R.string.ad_blocker_disabled_header));
        counter.setVisibility(View.GONE);
        adsBlocked.setText(getString(R.string.ad_blocker_disabled));
        enableAdBlock.setVisibility(View.GONE);
        antitrackingTable.setVisibility(View.GONE);
        helpButton.setText(Objects.requireNonNull(getContext()).getString(R.string.activate));
    }

    @Override
    protected void setEnabled(boolean enabled) {
        super.setEnabled(enabled);
        mAdapter.setEnabled(enabled);
        mAdapter.notifyDataSetChanged();
        final Context context = Objects.requireNonNull(getContext());
        if (enabled) {
            adblockHeader.setText(context.getString(R.string.adblocking_header));
            adsBlocked.setText(context.getString(R.string.adblocking_ads_blocked));
        } else {
            adblockHeader.setText(getContext().getString(R.string.adblocking_header_disabled));
            adsBlocked.setText(getContext().getString(R.string.adblocking_ads_blocked_disabled));
        }
    }

    private int countTotalAds(ArrayList<AdBlockDetailsModel> mDetails) {
        int adCount = 0;
        for (AdBlockDetailsModel model : mDetails) {
            adCount += model.adBlockCount;
        }
        return adCount;
    }

    private void setTableVisibility(ArrayList<AdBlockDetailsModel> details) {
        if (!preferenceManager.getAdBlockEnabled()) {
            antitrackingTable.setVisibility(View.GONE);
            trackersList.setVisibility(View.GONE);
            return;
        }
        if (details != null && antitrackingTable != null) {
            final int visibility = details.size() > 0 ?
                    View.VISIBLE : View.GONE;
            antitrackingTable.setVisibility(visibility);
        }
    }

    @SuppressWarnings("UnusedParameters")
    @OnClick(R.id.button_ok)
    void onOkClicked(View v) {
        bus.post(new Messages.DismissControlCenter());
        if (!preferenceManager.getAdBlockEnabled()) {
            bus.post(new Messages.EnableAdBlock());
            telemetry.sendCCOkSignal(TelemetryKeys.ACTIVATE, TelemetryKeys.ADBLOCK);
        } else {
            telemetry.sendCCOkSignal(TelemetryKeys.OK, TelemetryKeys.ATTRACK);
        }
    }

    @SuppressWarnings("UnusedParameters")
    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                adBlockingHelpUrlDe : adBlockingHelpUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(getTabId(), helpUrl, false));
        bus.post(new Messages.DismissControlCenter());
        telemetry.sendLearnMoreClickSignal(TelemetryKeys.ADBLOCK);
    }

    @SuppressWarnings("UnusedParameters")
    @Subscribe
    public void updateList(Messages.UpdateAdBlockingList event) {
        updateList();
    }

    void updateList() {
        ArrayList<AdBlockDetailsModel> details = getAdBlockDetails();
        final int adCount = countTotalAds(details);
        counter.setText(String.format(Locale.getDefault(), "%d", adCount));
        mAdapter.updateList(details);
        setTableVisibility(details);
    }

    @NonNull
    private ArrayList<AdBlockDetailsModel> getAdBlockDetails() {
        final ArrayList<AdBlockDetailsModel> adsDetails = new ArrayList<>();
        final ReadableMap adBlockData = adb.getAdBlockingInfo(mHashCode);
        if (adBlockData != null && adBlockData.hasKey("advertisersList")) {
            final ReadableMap advertisersList = adBlockData.getMap("advertisersList");
            final ReadableMapKeySetIterator iterator = advertisersList.keySetIterator();
            while (iterator.hasNextKey()) {
                final String companyName = iterator.nextKey();
                final int count = advertisersList.getArray(companyName).size();
                adsDetails.add(new AdBlockDetailsModel(companyName, count));
            }
            Collections.sort(adsDetails, (lhs, rhs) -> {
                final int count = rhs.adBlockCount - lhs.adBlockCount;
                return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
            });
        }
        return adsDetails;
    }

    @Override
    public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
        setEnabled(isChecked);
        adb.toggleUrl(mUrl, true);
        telemetry.sendCCToggleSignal(isChecked, TelemetryKeys.ADBLOCK);
        bus.post(new Messages.ReloadPage());
        bus.post(new Messages.DismissControlCenter());
    }

    public static AdBlockingFragment create(@NonNull String tabId, int hashCode, String url, boolean isIncognito) {
        final AdBlockingFragment fragment = new AdBlockingFragment();
        final Bundle arguments = new Bundle();
        arguments.putString(KEY_TAB_ID, tabId);
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }
}
