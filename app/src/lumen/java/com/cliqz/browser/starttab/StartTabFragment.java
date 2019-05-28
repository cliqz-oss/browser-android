package com.cliqz.browser.starttab;

import androidx.annotation.DrawableRes;
import androidx.fragment.app.Fragment;

/**
 * @author Ravjit Uppal
 */
abstract class StartTabFragment extends Fragment {

    abstract String getTitle();

    abstract @DrawableRes
    int getIconId();
}
