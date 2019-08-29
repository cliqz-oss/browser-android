package com.cliqz.browser.main;

import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.ItemTouchHelper;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.cliqz.browser.R;
import com.cliqz.browser.overview.OverviewFragment;
import com.cliqz.browser.overview.OverviewTabsEnum;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.nove.Subscribe;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import acr.browser.lightning.database.HistoryDatabase;
import butterknife.BindView;
import butterknife.ButterKnife;
import timber.log.Timber;

/**
 * @author Stefano Pacifici
 * @author Ravjit Singh
 */
public class FavoritesFragment extends FragmentWithBus {

    private static final String TAG = FavoritesFragment.class.getSimpleName();
    private boolean isMultiSelect;
    private FavoritesAdapter adapter;
    private RecyclerView favoritesListView;
    private final ArrayList<FavoriteModel> favoritesList = new ArrayList<>();
    private View contextualToolBar;
    private TextView contextualToolBarTitle;

    @BindView(R.id.ll_no_favorite)
    LinearLayout noFavoriteLayout;

    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        favoritesListView = null;
        contextualToolBar = ((OverviewFragment) getParentFragment()).contextualToolBar;
        contextualToolBarTitle = contextualToolBar.findViewById(R.id.contextual_title);
        final View view = inflater.inflate(R.layout.fragment_favorite, container, false);
		ButterKnife.bind(this, view);
		return view;
    }

    @Override
    public void onStart() {
        super.onStart();
        prepareListData();
        if (checkNoFavorites()) {
            return;
        }
        if (adapter == null) {
            adapter = new FavoritesAdapter(favoritesList, engine, handler, new FavoritesAdapter.ClickListener() {
                @Override
                public void onClick(View view, int position) {
                    if (isMultiSelect) {
                        multiSelect(position);
                    } else {
                        bus.post(CliqzMessages.OpenLink.open(favoritesList.get(position).getUrl()));
                    }
                }

                @Override
                public void onLongPress(View view, int position) {
                    //if view is being swiped ignore long press
                    if (view.getTranslationX() != 0) {
                        return;
                    }
                    if (!isMultiSelect) {
                        adapter.multiSelectList.clear();
                        showContextualMenu();
                    }
                    multiSelect(position);
                }
            });
        }
        prepareRecyclerView();
    }

    public boolean checkNoFavorites() {
        if (favoritesList.size() == 0) {
            noFavoriteLayout.setVisibility(View.VISIBLE);
            return true;
        }
        return false;
    }

    @Override
    public void onStop() {
        super.onStop();
        hideContextualMenu();
    }

    @Subscribe
    public void onOverviewTabSwitched(Messages.OnOverviewTabSwitched event) {
        if (event.position != OverviewTabsEnum.FAVORITES.getFragmentIndex()) {
            hideContextualMenu();
        }
    }

    @Subscribe
    public void onContextualBarCanceled(Messages.OnContextualBarCancelPressed event) {
        if (((OverviewFragment)getParentFragment()).getCurrentPageIndex()
                == OverviewTabsEnum.FAVORITES.getFragmentIndex()) {
            hideContextualMenu();
        }
    }

    @Subscribe
    public void onContextualBarDelete(Messages.OnContextualBarDeletePressed event) {
        if (((OverviewFragment)getParentFragment()).getCurrentPageIndex()
                == OverviewTabsEnum.FAVORITES.getFragmentIndex()) {
            deleteSelectedItems();
        }
    }

    private void prepareRecyclerView() {
        if (favoritesListView != null) {
            return;
        }
        final View view = getView();
        if (view == null) {
            return;
        }
        favoritesListView = view.findViewById(R.id.history_rview);
        favoritesListView.setLayoutManager(new LinearLayoutManager(getContext()));

        //callback to handle swipe and delete
        final ItemTouchHelper.SimpleCallback simpleItemTouchCallback =
                new ItemTouchHelper.SimpleCallback(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT) {

                    @Override
                    public int getSwipeDirs(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder) {
                        //Dont swipe when contextual menu is enabled
                        if (isMultiSelect) {
                            return 0;
                        }
                        return super.getSwipeDirs(recyclerView, viewHolder);
                    }

                    @Override
                    public boolean onMove(RecyclerView recyclerView, RecyclerView.ViewHolder viewHolder, RecyclerView.ViewHolder target) {
                        return false;
                    }

                    @Override
                    public void onSwiped(RecyclerView.ViewHolder viewHolder, int direction) {
                        final int position = viewHolder.getAdapterPosition();
                        historyDatabase.setFavorites(favoritesList.get(position).getUrl(), null,
                                System.currentTimeMillis(), false);
                        favoritesList.remove(position);
                        adapter.notifyItemRemoved(position);
                        checkNoFavorites();
                    }
                };

        //callbacks for click and long click on items
        final ItemTouchHelper itemTouchHelper = new ItemTouchHelper(simpleItemTouchCallback);
        itemTouchHelper.attachToRecyclerView(favoritesListView);
        favoritesListView.setAdapter(adapter);
    }

    private void prepareListData() {
        favoritesList.clear();
        final JSONArray favoritesJsonArray = historyDatabase.getFavorites();
        try {
            for (int i = 0; i < favoritesJsonArray.length(); i++) {
                final JSONObject favoriteItem = favoritesJsonArray.getJSONObject(i);
                favoritesList.add(new FavoriteModel(favoriteItem.optString(HistoryDatabase.HistoryKeys.URL),
                        favoriteItem.optString(HistoryDatabase.HistoryKeys.TITLE)));
            }
        } catch (JSONException e) {
            Timber.e(e, "error parsing favorites json");
        }
    }

    private void multiSelect(int position) {
        if (adapter.multiSelectList.contains(position)) {
            adapter.multiSelectList.remove(Integer.valueOf(position));
        } else {
            adapter.multiSelectList.add(position);
        }
        if (adapter.multiSelectList.size() > 0) {
            contextualToolBarTitle.setText(getResources().getQuantityString(R.plurals.items,
                    adapter.multiSelectList.size(), adapter.multiSelectList.size()));
        } else {
            hideContextualMenu();
        }
        adapter.notifyItemChanged(position);

    }

    private void deleteSelectedItems() {
        for (int i = adapter.multiSelectList.size() - 1; i >= 0; i--) {
            int position = adapter.multiSelectList.get(i);
            historyDatabase.setFavorites(favoritesList.get(position).getUrl(), null,
                    System.currentTimeMillis(), false);
            favoritesList.remove(position);
            adapter.notifyItemRemoved(position);
        }
        hideContextualMenu();
        checkNoFavorites();
    }

    private void showContextualMenu() {
        //if its already visible dont execute the next lines
        if (isMultiSelect) {
            return;
        }
        isMultiSelect = true;
        getParentFragment().setHasOptionsMenu(false);
        setDisplayHomeAsUpEnabled(false);
        contextualToolBar.setVisibility(View.VISIBLE);
    }

    private void hideContextualMenu() {
        //if its already hidden dont execute the next lines
        if (!isMultiSelect) {
            return;
        }
        isMultiSelect = false;
        adapter.multiSelectList.clear();
        adapter.notifyDataSetChanged();
        getParentFragment().setHasOptionsMenu(true);
        setDisplayHomeAsUpEnabled(true);
        contextualToolBar.setVisibility(View.GONE);
    }

}