package com.cliqz.browser.starttab;

import android.support.annotation.DrawableRes;
import android.support.v4.app.Fragment;

/**
 * @author Ravjit Uppal
 */
abstract class StartTabFragment extends Fragment {

    abstract String getTitle();

    abstract @DrawableRes int getIconId();
}
