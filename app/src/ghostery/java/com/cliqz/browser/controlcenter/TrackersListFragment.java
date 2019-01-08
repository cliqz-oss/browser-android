package com.cliqz.browser.controlcenter;

import android.net.Uri;
import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.annotation.Nullable;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ExpandableListView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.Messages;
import com.cliqz.jsengine.AntiTracking;
import com.cliqz.jsengine.JSBridge;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.github.mikephil.charting.utils.Utils;

import java.util.*;

import javax.inject.Inject;

import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 */
public class TrackersListFragment extends ControlCenterFragment{

    public static final String TAG = TrackersOverviewFragment.class.getSimpleName();

    private int mHashCode;
    private String mUrl;
    private final List<GhosteryCategories> listDataHEader = new ArrayList<>();
    private final HashMap<String, List<TrackerCompanyModel>> listDataChild = new HashMap<>();

    @Inject
    public AntiTracking attrack;

    @Inject
    public Bus bus;

    @Bind(R.id.ghost_trackers_list)
    ExpandableListView expandableListView;

    ExpandableListAdapter adapter;

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        final Bundle arguments = getArguments();
        mHashCode = arguments.getInt(KEY_HASHCODE);
        mUrl = arguments.getString(KEY_URL);
    }

    @Override
    protected View onCreateThemedView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        ControlCenterDialog.getComponent().inject(this);
        final ReadableMap details;
        attrack.getTabThirdPartyInfo(mHashCode, new JSBridge.Callback() {
            @Override
            public void callback(ReadableMap result) {
                prepareData(result);
            }
        });
        adapter = new ExpandableListAdapter(getContext(), listDataHEader,
                listDataChild, !attrack.isWhitelisted(Uri.parse(mUrl).getHost()));
        final @LayoutRes int layout = R.layout.ghoster_trackers_list;
        final View view = inflater.inflate(layout, container, false);
        view.setAlpha(0.97f);
        ButterKnife.bind(this, view);
        expandableListView.setAdapter(adapter);
        DisplayMetrics metrics = new DisplayMetrics();
        getActivity().getWindowManager().getDefaultDisplay().getMetrics(metrics);
        int width = metrics.widthPixels;
        expandableListView.setIndicatorBoundsRelative(width - (int)Utils.convertPixelsToDp(50), width - (int)Utils.convertPixelsToDp(10));
        return view;
    }

    public static TrackersListFragment create(int hashCode, String url, boolean isIncognito) {
        final TrackersListFragment fragment = new TrackersListFragment();
        final Bundle arguments = new Bundle();
        arguments.putInt(KEY_HASHCODE, hashCode);
        arguments.putString(KEY_URL, url);
        arguments.putBoolean(KEY_IS_INCOGNITO, isIncognito);
        fragment.setArguments(arguments);
        return fragment;
    }

    private void prepareData(ReadableMap data) {
        listDataHEader.clear();
        listDataChild.clear();
        ReadableMap innerResult = data.getMap("result");
        Log.d("clostery", innerResult.toString());
        for (ReadableMapKeySetIterator it = innerResult.keySetIterator(); it.hasNextKey(); ) {
            String name = it.nextKey();
            ReadableMap category = innerResult.getMap(name);
            listDataHEader.add(GhosteryCategories.safeValueOf(name));
            List<TrackerCompanyModel> companies = new ArrayList<>();
            for (ReadableMapKeySetIterator itt = category.keySetIterator(); itt.hasNextKey(); ) {
                final String companyName = itt.nextKey();
                final boolean isBlocked = category.getBoolean(companyName);
                companies.add(new TrackerCompanyModel(companyName, isBlocked));
            }
            Collections.sort(companies, new CompanyComparator());
            listDataChild.put(GhosteryCategories.safeValueOf(name).name(), companies);
        }
        Collections.sort(listDataHEader, new CustomComparator());
    }

    @Override
    public void onResume() {
        super.onResume();
        bus.register(this);
    }

    @Override
    public void onPause() {
        super.onPause();
        bus.unregister(this);
    }

    @Subscribe
    public void updateList(Messages.UpdateAntiTrackingList event) {
        attrack.getTabThirdPartyInfo(mHashCode, new JSBridge.Callback() {
            @Override
            public void callback(ReadableMap result) {
                prepareData(result);
            }
        });
        adapter.notifyDataSetInvalidated();
    }

    private class CustomComparator implements Comparator<GhosteryCategories> {

        @Override
        public int compare(GhosteryCategories o1, GhosteryCategories o2) {
            final int sizeDiff = listDataChild.get(o2.name()).size() - listDataChild.get(o1.name()).size();
            if (sizeDiff != 0) {
                return sizeDiff;
            }
            // secondary sort by category name
            return o1.name().compareTo(o2.name());
        }
    }

    private static class CompanyComparator implements Comparator<TrackerCompanyModel> {
        @Override
        public int compare(TrackerCompanyModel o1, TrackerCompanyModel o2) {
            return o1.trackerName.compareTo(o2.trackerName);
        }
    }

}
