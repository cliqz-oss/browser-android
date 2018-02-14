package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v7.widget.AppCompatButton;
import android.support.v7.widget.AppCompatImageView;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
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
import java.util.Comparator;
import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.preference.PreferenceManager;
import butterknife.Bind;
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
    private static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";
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

    @Bind(R.id.counter)
    TextView counter;

    @Bind(R.id.trackers_list)
    RecyclerView trackersList;

    @Bind(R.id.button_ok)
    AppCompatButton helpButton;

    @Bind(R.id.companies_header)
    TextView companiesHeader;

    @Bind(R.id.counter_header)
    TextView counterHeader;

    @Bind(R.id.upperLine)
    View upperLine;

    @Bind(R.id.lowerLine)
    View lowerLine;

    @Bind(R.id.anti_tracking_table)
    View antitrackingTable;

    @Bind(R.id.adblock_enable)
    Switch enableAdBlock;

    @Bind(R.id.adblock_icon)
    AppCompatImageView adBlockIcon;

    @Bind(R.id.adblocking_header)
    TextView adblockHeader;

    @Bind(R.id.ads_blocked)
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
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();

        mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
        mUrl = arguments.getString(ControlCenterFragment.KEY_URL);
        mHashCode = arguments.getInt(KEY_HASHCODE);
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
        helpButton.setText(getContext().getString(R.string.activate));
    }

    @Override
    protected void setEnabled(boolean enabled) {
        super.setEnabled(enabled);
        mAdapter.setEnabled(enabled);
        mAdapter.notifyDataSetChanged();
        if (enabled) {
            adblockHeader.setText(getContext().getString(R.string.adblocking_header));
            adsBlocked.setText(getContext().getString(R.string.adblocking_ads_blocked));
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
        bus.post(new BrowserEvents.OpenUrlInNewTab(helpUrl));
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
        if (adBlockData != null) {
            final ReadableMap advertisersList = adBlockData.getMap("advertisersList");
            final ReadableMapKeySetIterator iterator = advertisersList.keySetIterator();
            while (iterator.hasNextKey()) {
                final String companyName = iterator.nextKey();
                final int count = advertisersList.getArray(companyName).size();
                adsDetails.add(new AdBlockDetailsModel(companyName, count));
            }
            Collections.sort(adsDetails, new Comparator<AdBlockDetailsModel>() {
                @Override
                public int compare(AdBlockDetailsModel lhs, AdBlockDetailsModel rhs) {
                    final int count = rhs.adBlockCount - lhs.adBlockCount;
                    return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
                }
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

    public static AdBlockingFragment create(int hashCode, String url, boolean isIncognito) {
        final AdBlockingFragment fragment = new AdBlockingFragment();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }
}
