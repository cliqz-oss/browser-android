package com.cliqz.browser.overview;

import android.os.Bundle;
import android.support.annotation.Nullable;
import android.support.design.widget.FloatingActionButton;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.CliqzBrowserState;
import com.cliqz.browser.main.MainActivityComponent;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.main.TabsManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.deckview.TabsDeckView;
import com.cliqz.jsengine.Engine;

import java.util.ArrayList;

import javax.inject.Inject;

import butterknife.Bind;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */

public class TabOverviewFragment extends Fragment implements TabsDeckView.TabsDeckViewListener {

    @SuppressWarnings("unused")
    private static final String TAG = TabOverviewFragment.class.getSimpleName();
    @Bind(R.id.tabs_list_view)
    TabsDeckView deckView;

    @Bind(R.id.new_tab_button)
    FloatingActionButton floatingActionButton;

    @Inject
    TabsManager tabsManager;

    @Inject
    Telemetry telemetry;

    @Inject
    Engine engine;

    @Inject
    MainActivityHandler handler;

    @Nullable
    @Override
    public View onCreateView(final LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.tabs_overview, container, false);
        ButterKnife.bind(this, view);
        floatingActionButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                telemetry.sendNewTabSignal(tabsManager.getTabCount()+1);
                final int position = tabsManager.buildTab().create();
                tabsManager.showTab(position, R.anim.new_tab_scale_animation);
            }
        });
        deckView.setListener(this);
        return view;
    }

    private void initializeViews() {
        final ArrayList<CliqzBrowserState> entries = new ArrayList<>();
        for (int i = 0; i < tabsManager.getTabCount(); i++) {
            entries.add(tabsManager.getTab(i).state);
        }
        deckView.refreshEntries(entries);
    }

    @Override
    public void onResume() {
        super.onResume();
        initializeViews();
    }

    @Override
    public void onStart() {
        super.onStart();
        final MainActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
            deckView.scrollToCard(tabsManager.getCurrentTabPosition());
        }
    }

    @Override
    public void onTabClosed(int position, CliqzBrowserState tabState) {
        telemetry.sendTabCloseSignal(TelemetryKeys.NA, position, tabsManager.getTabCount()-1,
                tabState.isIncognito());
        tabsManager.deleteTab(position);
    }

    @Override
    public void onTabClicked(int position, CliqzBrowserState state) {
        telemetry.sendTabOpenSignal(position, tabsManager.getTabCount(), state.isIncognito());
        tabsManager.showTab(position);
    }
}
