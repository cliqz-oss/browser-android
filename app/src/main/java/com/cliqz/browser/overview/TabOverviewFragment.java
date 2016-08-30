package com.cliqz.browser.overview;

import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.design.widget.FloatingActionButton;
import android.support.v4.app.Fragment;
import android.support.v7.widget.LinearLayoutManager;
import android.support.v7.widget.RecyclerView;
import android.support.v7.widget.helper.ItemTouchHelper;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.di.components.ActivityComponent;
import com.cliqz.browser.main.MainActivity;
import com.cliqz.browser.main.Messages;
import com.cliqz.browser.main.TabsManager;
import com.squareup.otto.Bus;
import com.squareup.otto.Subscribe;

import javax.inject.Inject;

/**
 * Created by Ravjit on 20/07/16.
 */
public class TabOverviewFragment extends Fragment {

    private RecyclerView mTabsListView;
    private TabsOverviewAdapter mTabsOverviewAdapter;
    private FloatingActionButton mNewTabButton;

    @Inject
    TabsManager tabsManager;

    @Inject
    Bus bus;

    @Nullable
    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.tabs_overview, container, false);
        mTabsListView = (RecyclerView) view.findViewById(R.id.tabs_list_view);
        mTabsListView.setLayoutManager(new LinearLayoutManager(getActivity()));
        mNewTabButton = (FloatingActionButton) view.findViewById(R.id.new_tab_button);
        mNewTabButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                tabsManager.addNewTab(null);
            }
        });
        ItemTouchHelper.SimpleCallback swipeCallback = new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {

            @Override
            public boolean onMove(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder, RecyclerView.ViewHolder target) {
                return false;
            }

            @Override
            public void onSwiped(RecyclerView.ViewHolder viewHolder, int direction) {
                tabsManager.deleteTab(viewHolder.getAdapterPosition());
                mTabsOverviewAdapter.notifyDataSetChanged();
            }
        };
        ItemTouchHelper itemTouchHelper = new ItemTouchHelper(swipeCallback);
        itemTouchHelper.attachToRecyclerView(mTabsListView);
        return view;
    }

    @Subscribe
    public void updateTahsOverview(Messages.UpdateTabsOverview event) {
        mTabsOverviewAdapter.notifyDataSetChanged();
    }

    @Override
    public void onStart() {
        super.onStart();
        final ActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
            bus.register(this);
        }
        mTabsOverviewAdapter = new TabsOverviewAdapter(getContext(), R.layout.tab_list_item, tabsManager);
        mTabsListView.setAdapter(mTabsOverviewAdapter);
    }

    @Override
    public void onStop() {
        super.onStop();
        if (bus != null) {
            bus.unregister(this);
        }
    }
}
