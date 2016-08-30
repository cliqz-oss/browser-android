package com.cliqz.browser.overview;

import android.content.res.TypedArray;
import android.os.Build;
import android.os.Bundle;
import android.support.design.widget.TabLayout;
import android.support.v4.app.Fragment;
import android.support.v4.content.ContextCompat;
import android.support.v4.view.ViewPager;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.Toolbar;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.webview.CliqzMessages;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import javax.inject.Inject;

public class OverviewFragment extends Fragment {

    private Toolbar mToolbar;
    private TabLayout mTabLayout;
    private ViewPager mViewPager;
    private OverviewPagerAdapter mOverviewPagerAdapter;

    @Inject
    Bus bus;

    @Inject
    TabsManager tabsManager;

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.activity_overview, container, false);
        final int themeResId = R.style.Theme_Cliqz_Overview;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            final TypedArray typedArray = getActivity().getTheme().obtainStyledAttributes(themeResId, new int[]{R.attr.colorPrimaryDark});
            final int resourceId = typedArray.getResourceId(0, R.color.normal_tab_primary_color);
            getActivity().getWindow().setStatusBarColor(ContextCompat.getColor(getContext(), resourceId));
            typedArray.recycle();
        }
        mOverviewPagerAdapter = new OverviewPagerAdapter(getChildFragmentManager());
        mViewPager = (ViewPager) view.findViewById(R.id.viewpager);
        mViewPager.setAdapter(mOverviewPagerAdapter);
        mToolbar = (Toolbar) view.findViewById(R.id.toolbar);
        ((AppCompatActivity)getActivity()).setSupportActionBar(mToolbar);
        ((AppCompatActivity)getActivity()).getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        ((AppCompatActivity)getActivity()).getSupportActionBar().setTitle(getContext().getString(R.string.overview));
        setHasOptionsMenu(true);
        mTabLayout = (TabLayout) view.findViewById(R.id.tabs);
        mTabLayout.setupWithViewPager(mViewPager);
        return view;
    }

    @Override
    public void onCreateOptionsMenu(Menu menu, MenuInflater inflater) {
        inflater.inflate(R.menu.fragment_overview_menu, menu);
        super.onCreateOptionsMenu(menu, inflater);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        final int id = item.getItemId();
        switch (id) {
            case R.id.action_new_tab:
                tabsManager.addNewTab(false);
                return true;
            case R.id.action_new_forget_tab:
                tabsManager.addNewTab(true);
                return true;
            case R.id.action_settings:
                if (bus != null) {
                    bus.post(new Messages.GoToSettings());
                }
                return true;
            default:
                return false;
        }
    }

    @Subscribe
    public void onBackPressed(Messages.BackPressed event) {
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
    }

    @Subscribe
    public void openLink(CliqzMessages.OpenLink event) {
        tabsManager.showTab(tabsManager.getCurrentTabPosition());
        tabsManager.getCurrentTab().openLink(event.url, false, true);
    }

    @Override
    public void onStart() {
        super.onStart();
        final ActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
            bus.register(this);
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (bus != null) {
            bus.unregister(this);
        }
    }
}
