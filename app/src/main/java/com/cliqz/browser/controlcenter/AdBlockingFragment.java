package com.cliqz.browser.controlcenter;

import android.content.res.Configuration;
import android.graphics.PorterDuff;
import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.annotation.NonNull;
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
import com.cliqz.browser.utils.Telemetry;
import com.cliqz.jsengine.Adblocker;
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
import butterknife.Bind;
import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * Created by Ravjit on 16/11/16.
 */

public class AdBlockingFragment extends Fragment {

    public static final String TAG = AdBlockingFragment.class.getSimpleName();

    private static final String adBlockingHelpUrlDe = "https://cliqz.com/whycliqz/adblocking";
    private static final String adBlockingHelpUrlEn = "https://cliqz.com/en/whycliqz/adblocking";
    private static final String KEY_IS_INCOGNITO = TAG + ".IS_INCOGNITO";
    private static final String KEY_URL = TAG + ".URL";

    private boolean mIsIncognito;

    private AdBlockListAdapter mAdapter;
    private String mUrl;

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

    @Bind(R.id.adblock_enable)
    Switch enableAdBlock;

    @Bind(R.id.adblock_icon)
    ImageView adBlockIcon;

    @Bind(R.id.adblocking_header)
    TextView adblockHeader;

    @Bind(R.id.ads_blocked)
    TextView adsBlocked;

    public static AdBlockingFragment create(String url, boolean isIncognito) {
        final AdBlockingFragment fragment = new AdBlockingFragment();
        final Bundle arguments = new Bundle();
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
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

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();

        mIsIncognito = arguments.getBoolean(KEY_IS_INCOGNITO, false);
        mUrl = arguments.getString(KEY_URL);
    }

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        BrowserApp.getActivityComponent(getActivity()).inject(this);
        mAdapter = new AdBlockListAdapter(mIsIncognito, this);
        final @LayoutRes int layout;
        final Configuration config = getResources().getConfiguration();
        switch (config.orientation) {
            case Configuration.ORIENTATION_UNDEFINED:
                if (config.screenWidthDp > config.screenHeightDp) {
                    layout = R.layout.ad_blocking_land_layout;
                } else {
                    layout = R.layout.ad_blocking_layout;
                }
                break;
            case Configuration.ORIENTATION_LANDSCAPE:
                layout = R.layout.ad_blocking_land_layout;
                break;
            default:
                layout = R.layout.ad_blocking_layout;
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
        final boolean isEnabled = !adb.isBlacklisted(mUrl);
        enableAdBlock.setChecked(isEnabled);
        updateColors(isEnabled);
        enableAdBlock.setOnCheckedChangeListener(new CompoundButton.OnCheckedChangeListener() {
            @Override
            public void onCheckedChanged(CompoundButton compoundButton, boolean isEnabled) {
                updateColors(isEnabled);
                adb.toggleUrl(mUrl, true);
            }
        });
        if (!preferenceManager.getAdBlockEnabled()) {
            updateView();
        }
        return view;
    }

    private void updateView() {
        final int color = ContextCompat.getColor(getContext(), R.color.security_global_disbaled);
        adblockHeader.setText(getString(R.string.ad_blocker_disabled_header));
        adblockHeader.setTextColor(color);
        counter.setVisibility(View.GONE);
        adsBlocked.setText(getString(R.string.ad_blocker_disabled));
        adsBlocked.setTextColor(color);
        enableAdBlock.setVisibility(View.GONE);
        websiteName.setVisibility(View.GONE);
        antitrackingTable.setVisibility(View.GONE);
        adBlockIcon.setColorFilter(color, PorterDuff.Mode.SRC_ATOP);
        helpButton.setText(getContext().getString(R.string.activate));
        helpButton.setBackgroundColor(ContextCompat.getColor(getContext(), R.color.security_enabled));
    }

    private void updateColors(boolean isEnabled) {
        final int iconColor = isEnabled ? R.color.security_enabled : R.color.security_disabled;
        adBlockIcon.setColorFilter(ContextCompat.getColor(getContext(), iconColor), PorterDuff.Mode.SRC_ATOP);
        adblockHeader.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        adsBlocked.setTextColor(ContextCompat.getColor(getContext(), iconColor));
        if (isEnabled) {
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

    @OnClick(R.id.button_ok)
    void onOkClicked(View v) {
        bus.post(new Messages.DismissControlCenter());
        if (!preferenceManager.getAdBlockEnabled()) {
            bus.post(new Messages.EnableAdBlock());
        }
    }

    @OnClick(R.id.learn_more)
    void onLearnMoreClicked(View v) {
        final String helpUrl = Locale.getDefault().getLanguage().equals("de") ?
                adBlockingHelpUrlDe : adBlockingHelpUrlEn;
        bus.post(new BrowserEvents.OpenUrlInNewTab(helpUrl));
        bus.post(new Messages.DismissControlCenter());
    }

    @Subscribe
    public void updateList(Messages.UpdateAdBlockingList event) {
        updateList();
    }

    void updateList() {
        ArrayList<AdBlockDetailsModel> details = getAdBlockDetails();
        if (details == null) {
            return;
        }
        final int adCount = countTotalAds(details);
        counter.setText(String.format(Locale.getDefault(), "%d", adCount));
        mAdapter.updateList(details);
        setTableVisibility(details);
    }

    @NonNull
    private ArrayList<AdBlockDetailsModel> getAdBlockDetails() {
        final ArrayList<AdBlockDetailsModel> adBlockDetails = new ArrayList<>();
        try {
            final JSONObject jsonObject = adb.getAdBlockingInfo(mUrl);
            final int totalCount = jsonObject.optInt("totalCount", 0);
            final JSONArray advertisersList = jsonObject.getJSONObject("advertisersList").names();
            if (advertisersList == null) {
                return adBlockDetails;
            }
            for (int i = 0; i < advertisersList.length(); i++) {
                String companyName = advertisersList.optString(i);
                final int adCounts = jsonObject.getJSONObject("advertisersList").getJSONArray(companyName).length();
                if (companyName.equals("_Unknown")) {
                    companyName = getContext().getString(R.string.others);
                }
                adBlockDetails.add(new AdBlockDetailsModel(companyName, adCounts));
            }
            Collections.sort(adBlockDetails, new Comparator<AdBlockDetailsModel>() {
                @Override
                public int compare(AdBlockDetailsModel lhs, AdBlockDetailsModel rhs) {
                    final int count = rhs.adBlockCount - lhs.adBlockCount;
                    return count != 0 ? count : lhs.companyName.compareToIgnoreCase(rhs.companyName);
                }
            });
        } catch (JSONException e) {
            Log.e(TAG, "Can't parse json from adblocking module", e);
        }
        return adBlockDetails;
    }

}
