package com.cliqz.browser.overview;

import androidx.annotation.StringRes;
import androidx.fragment.app.Fragment;

import com.cliqz.browser.R;
import com.cliqz.browser.main.FavoritesFragment;
import com.cliqz.browser.main.HistoryFragment;
import com.cliqz.browser.main.OffrzFragment;

/**
 * @author Stefano Pacifici
 */
public enum OverviewTabsEnum {

    UNDEFINED(R.string.untitled, null),
    TABS(R.string.open_tabs, TabOverviewFragment.class),
    HISTORY(R.string.history, HistoryFragment.class),
    OFFRZ(R.string.myoffrz_label, OffrzFragment.class),
    FAVORITES(R.string.favorites, FavoritesFragment.class);

    final @StringRes int title;
    private final Class<? extends Fragment> clazz;

    OverviewTabsEnum(@StringRes int title, Class<? extends Fragment> clazz) {
        this.title = title;
        this.clazz = clazz;
    }

    public int getFragmentIndex() {
        switch (this) {
            case TABS:
                return 0;
            case HISTORY:
                return 1;
            case OFFRZ:
                return 2;
            case FAVORITES:
                return 3;
            default:
                throw new RuntimeException("Unsupported index");
        }
    }

    public Fragment newFragmentInstance() {
        try {
            return clazz.newInstance();
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
