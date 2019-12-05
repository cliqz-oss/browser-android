package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.net.Uri;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CompoundButton;
import android.widget.Switch;
import android.widget.TextView;

import androidx.annotation.LayoutRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.AppCompatButton;
import androidx.appcompat.widget.AppCompatImageView;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.Messages.ControlCenterStatus;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnCheckedChanged;
import butterknife.OnClick;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */
public class AntiTrackingFragment extends ControlCenterFragment implements CompoundButton.OnCheckedChangeListener{

    public static final String TAG = AntiTrackingFragment.class.getSimpleName();

    private static final String antiTrackingHelpUrlDe = "https://cliqz.com/whycliqz/anti-tracking";
    private static final String antiTrackingHelpUrlEn = "https://cliqz.com/en/whycliqz/anti-tracking";

    private TrackersListAdapter mAdapter;
    private int mTrackerCount = 0;
    private String mUrl;
    private int mHashCode;

    @Inject
    public Bus bus;

    @Inject
    public Telemetry telemetry;

    @Inject
    public AntiTracking attrack;

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

    @BindView(R.id.attrack_enable)
    Switch enableAttrack;

    @BindView(R.id.attrack_icon)
    AppCompatImageView attrackIcon;

    @BindView(R.id.antitracking_header)
    TextView attrackHeader;

    @BindView(R.id.trackers_blocked)
    TextView trackersBlocked;

    @Override
    protected void parseArguments(@NonNull Bundle args) {
        mUrl = args.getString(ControlCenterFragment.KEY_URL);
        mHashCode = args.getInt(KEY_HASHCODE);
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
        ControlCenterDialog.getComponent().inject(this);
        mAdapter = new TrackersListAdapter(mIsIncognito, this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.anti_tracking_layout_land;
                } else {
                    layout = R.layout.anti_tracking_layout;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.anti_tracking_layout_land;
                break;
            default:
                layout = R.layout.anti_tracking_layout;
                break;
        }
        final View view = inflater.inflate(layout, container, false);
        ButterKnife.bind(this, view);
        view.setAlpha(0.97f);
        trackersList.setLayoutManager(new LinearLayoutManager(getContext()));
        trackersList.setAdapter(mAdapter);
        final boolean isEnabled = !attrack.isWhitelisted(mUrl);
        enableAttrack.setChecked(isEnabled);
        enableAttrack.setText(Uri.parse(mUrl).getHost());
        enableAttrack.setOnCheckedChangeListener(this);
        if (!preferenceManager.isAttrackEnabled()) {
            setGenerallyDisabled();
        } else {
            setEnabled(isEnabled);
        }
        return view;
    }

    @OnCheckedChanged(R.id.attrack_enable)
    void onChecked(boolean isEnabled) {
        if (mUrl.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)) {
            return;
        }
        setEnabled(isEnabled);
        final Uri uri = Uri.parse(mUrl);
        final String host = uri != null ? uri.getHost() : null;
        if (host != null) {
            if (isEnabled) {
                attrack.removeDomainFromWhitelist(host);
            } else {
                attrack.addDomainToWhitelist(host);
            }
        }
        telemetry.sendCCToggleSignal(isEnabled, TelemetryKeys.ATTRACK);
    }

    private void setGenerallyDisabled() {
        setEnabled(false);
        attrackHeader.setText(getString(R.string.attrack_disabled_header));
        counter.setVisibility(View.GONE);
        trackersBlocked.setText(getString(R.string.attrack_disabled));
        enableAttrack.setVisibility(View.GONE);
        antitrackingTable.setVisibility(View.GONE);
        helpButton.setText(getString(R.string.activate));
    }

    @Override
    protected void setEnabled(boolean isEnabled) {
        super.setEnabled(isEnabled);
        mAdapter.setEnabled(isEnabled);
        mAdapter.notifyDataSetChanged();
        final ControlCenterStatus status =
                isEnabled ? ControlCenterStatus.ENABLED : ControlCenterStatus.DISABLED;
        if (isEnabled) {
            attrackHeader.setText(getString(R.string.antitracking_header));
            trackersBlocked.setText(getString(R.string.antitracking_datapoints));
        } else {
            attrackHeader.setText(getString(R.string.antitracking_header_disabled));
            trackersBlocked.setText(getString(R.string.antitracking_datapoints_disabled));
        }
        bus.post(new Messages.UpdateControlCenterIcon(status));
    }

    private void setTableVisibility(List<TrackerDetailsModel> details) {
        if (!preferenceManager.isAttrackEnabled()) {
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
        if (!preferenceManager.isAttrackEnabled()) {
            bus.post(new Messages.EnableAttrack());
            telemetry.sendCCOkSignal(TelemetryKeys.ACTIVATE, TelemetryKeys.ATTRACK);
        } else {
            telemetry.sendCCOkSignal(TelemetryKeys.OK, TelemetryKeys.ATTRACK);
        }
    }

    @SuppressWarnings("UnusedParameters")
    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                antiTrackingHelpUrlDe : antiTrackingHelpUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(getTabId(), helpUrl, false));
        bus.post(new Messages.DismissControlCenter());
        telemetry.sendLearnMoreClickSignal(TelemetryKeys.ATTRACK);
    }

    @Subscribe
    public void updateList(Messages.UpdateAntiTrackingList event) {
        this.mTrackerCount = event.trackerCount;
        updateList();
    }

    private void updateList() {
        final List<TrackerDetailsModel> details = getTrackerDetails();
        counter.setText(String.format(Locale.getDefault(), "%d", mTrackerCount));
        mAdapter.updateList(details);
        setTableVisibility(details);
    }

    private List<TrackerDetailsModel> getTrackerDetails() {
        mTrackerCount = 0;
        final ReadableMap attrackData = attrack.getTabBlockingInfo(mHashCode);
        if(attrackData == null) {
            return Collections.emptyList();
        }

        final ReadableMap companies = attrackData.getMap("companies");
        final ReadableMap trackers = attrackData.getMap("trackers");
        final ReadableMap companyInfo = attrackData.getMap("companyInfo");

        if (companies == null || trackers == null || companyInfo == null) {
            return Collections.emptyList();
        }

        final Map<String, String> domainsToName = new HashMap<>();
        final ReadableMapKeySetIterator companiesIterator = companies.keySetIterator();
        while (companiesIterator.hasNextKey()) {
            final String companyName = companiesIterator.nextKey();
            final ReadableArray domains = companies.getArray(companyName);
            if (domains == null) {
                continue;
            }
            for (Object obj: domains.toArrayList()) {
                domainsToName.put(obj.toString(), companyName);
            }
        }
        final ReadableMapKeySetIterator trackersIterator = trackers.keySetIterator();
        final Map<String, TrackerDetailsModel> trackerDetails = new HashMap<>();
        while (trackersIterator.hasNextKey()) {
            final String domain = trackersIterator.nextKey();
            final ReadableMap trackerInfo = trackers.getMap(domain);
            if (trackerInfo == null) {
                continue;
            }
            final int c = trackerInfo.getInt("tokens_removed");
            final String companyName = domainsToName.containsKey(domain) ?
                    domainsToName.get(domain) : domain;
            mTrackerCount += c;
            if (companyName == null) {
                continue;
            }
            if (trackerDetails.containsKey(companyName)) {
                final TrackerDetailsModel tdm = trackerDetails.get(companyName);
                trackerDetails.put(companyName, new TrackerDetailsModel(
                        companyName, tdm.trackerCount + c, tdm.wtm));
            } else {
                final ReadableMap domainInfo = companyInfo.getMap(companyName);
                if (domainInfo == null) {
                    continue;
                }
                final String wtm = domainInfo.getString("wtm");
                trackerDetails.put(companyName,
                        new TrackerDetailsModel(companyName, c, wtm != null ? wtm : "unknown"));
            }
        }
        final List<TrackerDetailsModel> result = new ArrayList<>(trackerDetails.values());
        Collections.sort(result, (lhs, rhs) -> {
            final int count = rhs.trackerCount - lhs.trackerCount;
            return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
        });
        return result;
    }

    public static AntiTrackingFragment create(@NonNull String tabId, int hashCode, String url, boolean isIncognito) {
        final AntiTrackingFragment fragment = new AntiTrackingFragment();
        final Bundle arguments = new Bundle();
        arguments.putString(KEY_TAB_ID, tabId);
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }

    @Override
    public void onCheckedChanged(CompoundButton buttonView, boolean isChecked) {
        if (mUrl.contains(TrampolineConstants.TRAMPOLINE_COMMAND_PARAM_NAME)) {
            return;
        }
        setEnabled(isChecked);
        final Uri uri = Uri.parse(mUrl);
        final String host = uri != null ? uri.getHost() : null;
        if (host != null) {
            if (isChecked) {
                attrack.removeDomainFromWhitelist(host);
            } else {
                attrack.addDomainToWhitelist(host);
            }
        }
        telemetry.sendCCToggleSignal(isChecked, TelemetryKeys.ATTRACK);
        bus.post(new Messages.ReloadPage());
        updateList();
        if (!isChecked) {
            bus.post(new Messages.DismissControlCenter());
        }
    }
}
