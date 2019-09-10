package com.cliqz.browser.starttab;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.ItemTouchHelper;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.cliqz.browser.R;
import com.cliqz.browser.app.BrowserApp;
import com.cliqz.browser.main.FavoriteModel;
import com.cliqz.browser.main.FavoritesAdapter;
import com.cliqz.browser.main.FlavoredActivityComponent;
import com.cliqz.browser.main.MainThreadHandler;
import com.cliqz.browser.webview.CliqzMessages;
import com.cliqz.jsengine.Engine;
import com.cliqz.nove.Bus;

import org.jetbrains.annotations.NotNull;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import javax.inject.Inject;

import acr.browser.lightning.database.HistoryDatabase;
import butterknife.BindView;
import butterknife.ButterKnife;
import timber.log.Timber;

/**
 * @author Ravjit Uppal
 */
public class FavoritesView extends FrameLayout implements Updatable {

    private FavoritesAdapter adapter;
    private final ArrayList<FavoriteModel> favoritesList = new ArrayList<>();

    @BindView(R.id.history_rview)
    RecyclerView favoritesListView;

    @Inject
    Engine engine;

    @Inject
    MainThreadHandler handler;

    @Inject
    Bus bus;

    @Inject
    HistoryDatabase historyDatabase;


    public FavoritesView(@NonNull Context context) {
        super(context);
        final View view = LayoutInflater.from(context).inflate(R.layout.fragment_favorite, this);
        ButterKnife.bind(this, view);

        final FlavoredActivityComponent component = BrowserApp.getActivityComponent(context);
        if (component != null) {
            component.inject(this);
        }
        prepareListData();
        adapter = new FavoritesAdapter(favoritesList, engine, handler, new FavoritesAdapter.ClickListener() {
            @Override
            public void onClick(View view, int position) {
                bus.post(CliqzMessages.OpenLink.open(favoritesList.get(position).getUrl()));
            }

            @Override
            public void onLongPress(View view, int position) {
            }
        });

        favoritesListView.setLayoutManager(new LinearLayoutManager(context));
        final ItemTouchHelper itemTouchHelper =new ItemTouchHelper(new TouchCallback());
        itemTouchHelper.attachToRecyclerView(favoritesListView);
        favoritesListView.setAdapter(adapter);
    }

    @Override
    public void update() {
        prepareListData();
        adapter.notifyDataSetChanged();
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

    private class TouchCallback extends ItemTouchHelper.SimpleCallback {
        TouchCallback() {
            super(0, ItemTouchHelper.LEFT | ItemTouchHelper.RIGHT);
        }

        @Override
        public int getSwipeDirs(@NonNull RecyclerView recyclerView,
                                @NonNull RecyclerView.ViewHolder viewHolder) {
            //Dont swipe when contextual menu is enabled
            return super.getSwipeDirs(recyclerView, viewHolder);
        }

        @Override
        public boolean onMove(@NonNull RecyclerView recyclerView,
                              @NonNull RecyclerView.ViewHolder viewHolder,
                              @NonNull RecyclerView.ViewHolder target) {
            return false;
        }

        @Override
        public void onSwiped(@NotNull RecyclerView.ViewHolder viewHolder, int direction) {
            final int position = viewHolder.getAdapterPosition();
            historyDatabase.setFavorites(favoritesList.get(position).getUrl(), null,
                    System.currentTimeMillis(), false);
            favoritesList.remove(position);
            adapter.notifyItemRemoved(position);
        }
    }
}
