package com.cliqz.browser.main;

import android.content.Context;
import android.content.res.Resources;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.ColorInt;
import androidx.annotation.MenuRes;
import androidx.annotation.Nullable;
import androidx.annotation.StyleRes;
import com.google.android.material.appbar.AppBarLayout;
import androidx.appcompat.widget.Toolbar;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;

import com.cliqz.browser.R;
import com.cliqz.browser.widget.AutocompleteEditText;
import com.readystatesoftware.systembartint.SystemBarTintManager;

import static android.R.attr.statusBarColor;

/**
 * @author Stefano Pacifici
 */
public abstract class BaseFragment extends FragmentWithBus {

    private static final int KEYBOARD_ANIMATION_DELAY = 200;
    private final Handler handler = new Handler(Looper.getMainLooper());
    protected ViewGroup mContentContainer;
    protected Toolbar mToolbar;
    protected AppBarLayout mStatusBar;
    protected AutocompleteEditText searchEditText;
    private View mCustomToolbarView;

    @Nullable
    @Override
    public final View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final int themeResId = getFragmentTheme();

        final Resources.Theme theme = getActivity().getTheme();
        final TypedValue value = new TypedValue();
        theme.resolveAttribute(R.attr.colorPrimaryDark, value, true);
        @ColorInt final int color = value.data;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getActivity().getWindow().setStatusBarColor(color);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            SystemBarTintManager tintManager = new SystemBarTintManager(getActivity());
            tintManager.setStatusBarTintEnabled(true);
            tintManager.setNavigationBarTintEnabled(true);
            tintManager.setTintColor(statusBarColor);
        }

        final LayoutInflater localInflater;
        if (themeResId != 0) {
            final Context themedContext = new ContextThemeWrapper(getContext(), themeResId);
            localInflater = inflater.cloneInContext(themedContext);
        } else {
            localInflater = inflater;
        }

        final View view = localInflater.inflate(R.layout.fragment_base, container, false);
        mStatusBar = (AppBarLayout) view.findViewById(R.id.statusbar);
        mToolbar = (Toolbar) view.findViewById(R.id.toolbar);
        mContentContainer = (ViewGroup) view.findViewById(R.id.content_container);
        searchEditText = (AutocompleteEditText) view.findViewById(R.id.search_edit_text);
        final View content = onCreateContentView(localInflater, mContentContainer, savedInstanceState);
        if (content != null) {
            mContentContainer.addView(content, new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        }
        mCustomToolbarView = onCreateCustomToolbarView(localInflater, mToolbar, savedInstanceState);
        if (mCustomToolbarView != null) {
            mToolbar.addView(mCustomToolbarView);
        }
        final int menuResId = getMenuResource();
        if (menuResId != 0) {
            mToolbar.inflateMenu(menuResId);
        }
        mToolbar.setOnMenuItemClickListener(new Toolbar.OnMenuItemClickListener() {
            @Override
            public boolean onMenuItemClick(MenuItem item) {
                return BaseFragment.this.onMenuItemClick(item);
            }
        });
        return view;
    }

    void delayedPostOnBus(final Object event) {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                bus.post(event);
            }
        }, KEYBOARD_ANIMATION_DELAY);
    }

    protected void showToolbar() {
        mStatusBar.setExpanded(true, true);
    }

    /**
     * Should return the content view of the children (of this class) fragments
     * @param inflater
     * @param container
     * @param savedInstanceState
     * @return the content view, can be null if you do not want anything to be added
     */
    @Nullable
    protected abstract View onCreateContentView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState);

    /**
     * Return the resource used to render the actions in the toolbar
     * @return the resource id associated with a menu
     */
    @MenuRes
    protected abstract int getMenuResource();

    /**
     * Handle actions in the toolbar
     * @param item
     * @return true if the action was handled, false otherwise
     */
    protected abstract boolean onMenuItemClick(MenuItem item);

    /**
     * Return a theme to be applied to the fragment, or 0 if no theme should be applied
     *
     * @return a theme to be applied to the fragment
     */
    @StyleRes
    protected abstract int getFragmentTheme();

    /**
     * The custom view to use for the toolbar
     * @param inflater
     * @param container
     * @param savedInstanceState
     * @return a custom view or null
     */
    @Nullable
    protected abstract View onCreateCustomToolbarView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState);

}
