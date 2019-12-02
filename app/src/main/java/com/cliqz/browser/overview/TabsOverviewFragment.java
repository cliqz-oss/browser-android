package com.cliqz.browser.overview;

import android.content.Context;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.main.MainThreadHandler;
import com.cliqz.nove.Bus;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import androidx.fragment.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.tabs.Tab;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.tabs.TabsManager;
import com.cliqz.browser.telemetry.Telemetry;
import com.cliqz.browser.telemetry.TelemetryKeys;
import com.cliqz.deckview.TabsDeckView;
import com.cliqz.jsengine.Engine;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.bus.BrowserEvents;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 * @author Stefano Pacifici
 */

public class TabsOverviewFragment extends Fragment implements TabsDeckView.TabsDeckViewListener {

    @SuppressWarnings("unused")
    private static final String TAG = TabsOverviewFragment.class.getSimpleName();
    @BindView(R.id.tabs_list_view)
    TabsDeckView deckView;

    @BindView(R.id.new_tab_button)
    FloatingActionButton floatingActionButton;

    @Inject
    TabsManager tabsManager;

    @Inject
    Telemetry telemetry;

    @Inject
    Engine engine;

    @Inject
    MainThreadHandler handler;

    @Inject
    Bus bus;

    @Nullable
    @Override
    public View onCreateView(@NotNull final LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        final View view = inflater.inflate(R.layout.tabs_overview, container, false);
        ButterKnife.bind(this, view);
        floatingActionButton.setOnClickListener(v -> {
            telemetry.sendNewTabSignal(tabsManager.getTabCount()+1);
            bus.post(new BrowserEvents.NewTab(false, R.anim.new_tab_scale_animation));
        });
        deckView.setListener(this);
        return view;
    }

    private void initializeViews() {
        final ArrayList<Tab> entries = new ArrayList<>();
        int currentPosition = 0;
        int i= -1;
        for (Tab tab: tabsManager.getAllTabs()) {
            i++;
            entries.add(tab);
            if (tab.id.equals(tabsManager.getCurrentTabId())) {
                currentPosition = i;
            }
        }
        deckView.refreshEntries(entries);
        if (currentPosition >= 0) {
            deckView.setSelectedTab(currentPosition);
            deckView.scrollToCard(currentPosition);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        initializeViews();
    }

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach(context);
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
    }

    @Override
    public void onTabClosed(int position, Tab tabState) {
        telemetry.sendTabCloseSignal(TelemetryKeys.NA, position, tabsManager.getTabCount()-1,
                tabState.isIncognito());
        tabsManager.closeTab(tabState.id);
        if (tabsManager.getTabCount() == 0) {
            bus.post(new BrowserEvents.NewTab(false, R.anim.new_tab_scale_animation));
        }
    }

    @Override
    public void onTabClicked(int position, Tab tab) {
        telemetry.sendTabOpenSignal(position, tabsManager.getTabCount(), tab.isIncognito());
        bus.post(new BrowserEvents.ShowTab(tab.id));
    }
}
