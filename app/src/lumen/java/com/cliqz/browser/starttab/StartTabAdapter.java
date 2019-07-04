package com.cliqz.browser.starttab;

import android.content.Context;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;

import com.cliqz.browser.R;
import com.cliqz.browser.starttab.freshtab.FreshTab;

/**
 * @author Ravjit Uppal
 */
public class StartTabAdapter extends IconTabLayout.ImagePagerAdapter {

    private final View[] views;
    private final int[] icons = new int[] {
            R.drawable.ic_fresh_tab,
            R.drawable.ic_history_white,
            R.drawable.ic_star_white
    };
    StartTabAdapter(@NonNull Context context) {
        views = new View[] {
                new FreshTab(context),
                new HistoryView(context),
                new FavoritesView(context)
        };
    }

    @NonNull
    @Override
    public Object instantiateItem(@NonNull ViewGroup container, int position) {
        final View view = views[position];
        container.addView(view);
        return view;
    }

    @Override
    public void destroyItem(@NonNull ViewGroup container, int position, @NonNull Object object) {
        final View view = views[position];
        container.removeView(view);
    }

    @Override
    public int getCount() {
        return views.length;
    }

    @Override
    public boolean isViewFromObject(@NonNull View view, @NonNull Object object) {
        return view.equals(object);
    }

    @Override
    public int getIcon(int position) {
        return icons[position];
    }

    void updateView(int position) {
        final View view = views[position];
        if (view instanceof Updatable) {
            ((Updatable) view).update();
        }
    }
}