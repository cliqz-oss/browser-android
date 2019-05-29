package com.cliqz.browser.starttab;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FavoriteModel;
import com.cliqz.browser.main.FavoritesAdapter;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.MainActivityHandler;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * @author Ravjit Uppal
 */
public class FavoritesFragment extends StartTabFragment {

    private static final String TAG = FavoritesFragment.class.getSimpleName();
    private FavoritesAdapter adapter;
    private RecyclerView favoritesListView;
    private final ArrayList<FavoriteModel> favoritesList = new ArrayList<>();

    @BindView(R.id.ll_no_favorite)
    LinearLayout noFavoriteLayout;

    @Inject
    Engine engine;

    @Inject
    MainActivityHandler handler;

    @Inject
    Bus bus;

    @Inject
    HistoryDatabase historyDatabase;


    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        favoritesListView = null;
        final View view = inflater.inflate(R.layout.fragment_favorite, container, false);
        ButterKnife.bind(this, view);
        return view;
    }

    @Override
    public void onStart() {
        super.onStart();
        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(getActivity());
        if (component != null) {
            component.inject(this);
        }
        prepareListData();
        if (checkNoFavorites()) {
            return;
        }
        if (adapter == null) {
            adapter = new FavoritesAdapter(favoritesList, engine, handler, new FavoritesAdapter.ClickListener() {
                @Override
                public void onClick(View view, int position) {
                    bus.post(CliqzMessages.OpenLink.open(favoritesList.get(position).getUrl()));
                }

                @Override
                public void onLongPress(View view, int position) {
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
            Log.e(TAG, "error parsing favorites json", e);
        }
    }

    @Override
    public String getTitle() {
        return "";
    }

    @Override
    public int getIconId() {
        return R.drawable.ic_star_white;
    }
}
