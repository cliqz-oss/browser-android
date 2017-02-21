package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.DrawableRes;
import android.support.annotation.LayoutRes;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.support.v4.content.ContextCompat;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.CompoundButton;
import android.widget.ImageView;
import android.widget.Switch;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TrackerDetailsModel;
import com.cliqz.browser.main.TrackersListAdapter;
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.jsengine.AntiTracking;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Locale;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import acr.browser.lightning.preference.PreferenceManager;
import acr.browser.lightning.view.TrampolineConstants;
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * Created by Ravjit on 16/11/16.
 */

public class AntiTrackingFragment extends Fragment {

    public static final String TAG = AntiTrackingFragment.class.getSimpleName();

    private static final String antiTrackingHelpUrlDe = "https://cliqz.com/whycliqz/anti-tracking";
    private static final String antiTrackingHelpUrlEn = "https://cliqz.com/en/whycliqz/anti-tracking";
    private static final String KEY_HASHCODE = TAG + ".HASHCODE";
    private static final String KEY_URL = TAG + ".URL";
    private static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";

    private boolean mIsIncognito;
    private TrackersListAdapter mAdapter;
    private int mTrackerCount = 0;
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

    @Bind(R.id.counter)
    TextView counter;

    @Bind(R.id.trackers_list)
    RecyclerView trackersList;

    @Bind(R.id.button_ok)
    Button helpButton;

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

    @Bind(R.id.website_name)
    TextView websiteName;

    @Bind(R.id.attrack_enable)
    Switch enableAttrack;

    @Bind(R.id.attrack_icon)
    ImageView attrackIcon;

    @Bind(R.id.antitracking_header)
    TextView attrackHeader;

    @Bind(R.id.trackers_blocked)
    TextView trackersBlocked;

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
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        BrowserApp.getActivityComponent(getActivity()).inject(this);
        mAdapter = new TrackersListAdapter(mIsIncognito, this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.anti_tracking_dialog_land;
                } else {
                    layout = R.layout.anti_tracking_dialog;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.anti_tracking_dialog_land;
                break;
            default:
                layout = R.layout.anti_tracking_dialog;
                break;
        }
        final View view = inflater.inflate(layout, container, false);
        ButterKnife.bind(this, view);
        final int popupBgColor = mIsIncognito ? R.color.incognito_tab_primary_color : R.color.white;
        final int popupTextColor = mIsIncognito ? R.color.white : R.color.incognito_tab_primary_color;
        view.setBackgroundColor(ContextCompat.getColor(getContext(), popupBgColor));
        view.setAlpha(0.97f);
        companiesHeader.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        counterHeader.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        counter.setTextColor(ContextCompat.getColor(getContext(), popupTextColor));
        helpButton.setTextColor(ContextCompat.getColor(getContext(), popupBgColor));
        helpButton.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        upperLine.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        lowerLine.getBackground().setColorFilter(ContextCompat.getColor(getContext(), popupTextColor), PorterDuff.Mode.SRC_ATOP);
        trackersList.setLayoutManager(new LinearLayoutManager(getContext()));
        trackersList.setAdapter(mAdapter);
        websiteName.setText(Uri.parse(mUrl).getHost());
        final boolean isEnabled = !attrack.isWhitelisted(Uri.parse(mUrl).getHost());
        enableAttrack.setChecked(isEnabled);
        updateColors(isEnabled);
        enableAttrack.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean isEnabled) {
                if (mUrl.contains(TrampolineConstants.CLIQZ_TRAMPOLINE_PREFIX)) {
                    return;
                }
                updateColors(isEnabled);
                if (isEnabled) {
                    attrack.removeDomainFromWhitelist(Uri.parse(mUrl).getHost());
                } else {
                    attrack.addDomainToWhitelist(Uri.parse(mUrl).getHost());
                }
            }
        });
        if (!preferenceManager.isAttrackEnabled()) {
            updateView();
        }
        return view;
    }

    private void updateView() {
        final int color = ContextCompat.getColor(getContext(), R.color.security_global_disbaled);
        attrackHeader.setText(getString(R.string.attrack_disabled_header));
        attrackHeader.setTextColor(color);
        counter.setVisibility(View.GONE);
        trackersBlocked.setText(getString(R.string.attrack_disabled));
        trackersBlocked.setTextColor(color);
        enableAttrack.setVisibility(View.GONE);
        websiteName.setVisibility(View.GONE);
        antitrackingTable.setVisibility(View.GONE);
        attrackIcon.setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        helpButton.setText(getContext().getString(R.string.activate));
        helpButton.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.security_enabled));
    }

    private void updateColors(boolean isEnabled) {
        final int iconColor = isEnabled ? R.color.security_enabled : R.color.security_disabled;
        @DrawableRes final int icon = isEnabled ? R.drawable.ic_cc_green : R.drawable.ic_cc_orange;
        attrackIcon.setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        attrackHeader.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        trackersBlocked.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        if (isEnabled) {
            attrackHeader.setText(getContext().getString(R.string.antitracking_header));
            trackersBlocked.setText(getContext().getString(R.string.antitracking_datapoints));
        } else {
            attrackHeader.setText(getContext().getString(R.string.antitracking_header_disabled));
            trackersBlocked.setText(getContext().getString(R.string.antitracking_datapoints_disabled));
        }
        bus.post(new Messages.UpdateControlCenterIcon(icon));
    }

    private int countTrackerPoints(ArrayList<TrackerDetailsModel> mDetails) {
        int trackerPoints = 0;
        if (mDetails == null) {
            return 0;
        }
        for (TrackerDetailsModel model: mDetails) {
            trackerPoints += model.trackerCount;
        }
        return trackerPoints;
    }

    private void setTableVisibility(ArrayList<TrackerDetailsModel> details) {
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

    @OnClick(R.id.button_ok)
    void onOkClicked(View v) {
        bus.post(new Messages.DismissControlCenter());
        if (!preferenceManager.isAttrackEnabled()) {
            bus.post(new Messages.EnableAttrack());
        }
    }

    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                antiTrackingHelpUrlDe : antiTrackingHelpUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(helpUrl));
        bus.post(new Messages.DismissControlCenter());
    }

    @Subscribe
    public void updateList(Messages.UpdateAntiTrackingList event) {
        this.mTrackerCount = event.trackerCount;
        updateList();
    }

    private void updateList() {
        ArrayList<TrackerDetailsModel> details = getTrackerDetails();
        counter.setText(String.format(Locale.getDefault(), "%d", mTrackerCount));
        mAdapter.updateList(details);
        setTableVisibility(details);
    }

    private ArrayList<TrackerDetailsModel> getTrackerDetails() {
        final ArrayList<TrackerDetailsModel> trackerDetails = new ArrayList<>();
        try {
            final JSONObject jsonObject = attrack.getTabBlockingInfo(mHashCode);
            final JSONArray companies = jsonObject.getJSONObject("companies").names();
            mTrackerCount = jsonObject.getJSONObject("requests").optInt("unsafe", 0);
            if (companies == null) {
                return trackerDetails;
            }
            for (int i = 0; i < companies.length(); i++) {
                final String key = companies.getString(i);
                final JSONArray domains = jsonObject.getJSONObject("companies").getJSONArray(key);
                int trackersCount = 0;
                for (int j = 0; j < domains.length(); j++) {
                    final JSONObject trackers = jsonObject.getJSONObject("trackers").getJSONObject(domains.optString(j));
                    trackersCount += trackers.optInt("tokens_removed", 0);
                }
                trackerDetails.add(new TrackerDetailsModel(key, trackersCount));
            }
            Collections.sort(trackerDetails, new Comparator<TrackerDetailsModel>() {
                @Override
                public int compare(TrackerDetailsModel lhs, TrackerDetailsModel rhs) {
                    final int count = rhs.trackerCount - lhs.trackerCount;
                    return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "Can't parse json from antitracking module", e);
        } catch (NullPointerException e) {
            Log.d(TAG, "Null webView", e);
        }
        return trackerDetails;
    }

    public static AntiTrackingFragment create(int hashCode, String url, boolean isIncognito) {
        final AntiTrackingFragment fragment = new AntiTrackingFragment();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }
}
