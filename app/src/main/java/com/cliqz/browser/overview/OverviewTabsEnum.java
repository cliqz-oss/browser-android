package com.cliqz.browser.overview;

import android.support.annotation.StringRes;
import android.support.v4.app.Fragment;

import com.cliqz.browser.R;
import com.cliqz.browser.main.FavoritesFragment;
import com.cliqz.browser.main.HistoryFragment;
import com.cliqz.browser.main.OffrzFragment;

import java.util.Locale;

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
        final Locale locale = Locale.getDefault();
        final String lang = locale.getLanguage();
        switch (this) {
            case TABS:
                return 0;
            case HISTORY:
                return 1;
            case OFFRZ:
                return "de".equals(lang) ? 2 : -1;
            case FAVORITES:
                return "de".equals(lang) ? 3 : 2;
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
