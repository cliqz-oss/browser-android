package com.cliqz.browser.overview;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;

import com.cliqz.browser.BuildConfig;
import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.nove.Bus;
import com.cliqz.nove.Subscribe;

import javax.inject.Inject;

public class OverviewFragment extends CommonOverviewFragment {

    private final static String TAB_OVERVIEW_TAG = "tab_overview_tag";

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
        final String title =
                activity.getString(BuildConfig.IS_LUMEN ? R.string.open_tabs : R.string.overview);
        toolbar.setTitle(title);
        activity.setSupportActionBar(toolbar);
        final ActionBar actionBar = activity.getSupportActionBar();
        if (actionBar != null) {
            actionBar.setDisplayHomeAsUpEnabled(true);
            actionBar.setTitle(title);
        }

        return view;
    }

    @Override
    public void onAttach(Context context) {
        super.onAttach(context);

        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
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
