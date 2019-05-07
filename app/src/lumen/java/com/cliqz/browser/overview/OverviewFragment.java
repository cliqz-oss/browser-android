package com.cliqz.browser.overview;

import android.content.Context;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v7.app.ActionBar;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

public class OverviewFragment extends Fragment {

    private final static String TAB_OVERVIEW_TAG = "tab_overview_tag";

    @Inject
    TabsManager tabsManager;

    @Inject
    Bus bus;

    public void setDisplayFavorites() {

    }

    public void setDisplayOffrz() {

    }

    public void setDisplayHistory() {

    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.activity_overview, container, false);
        final Toolbar toolbar = view.findViewById(R.id.toolbar);
        final AppCompatActivity activity = (AppCompatActivity) getActivity();
        assert activity != null;
        toolbar.setTitle(activity.getString(R.string.overview));
        activity.setSupportActionBar(toolbar);
        final ActionBar actionBar = activity.getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setTitle(activity.getString(R.string.overview));
        }

        return view;
    }

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);

        final MainActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        bus.register(this);

        final FragmentManager fm = getChildFragmentManager();
        if (fm.findFragmentByTag(TAB_OVERVIEW_TAG) == null) {
            fm.beginTransaction()
                    .add(R.id.tab_overview_container, new TabOverviewFragment(), TAB_OVERVIEW_TAG)
                    .commitAllowingStateLoss();
        }
    }

    @Override
    public void onPause() {
        bus.unregister(this);
        super.onPause();
    }

    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
    }

}
