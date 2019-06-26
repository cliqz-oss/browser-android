package com.cliqz.browser.starttab;

import androidx.annotation.DrawableRes;
import androidx.fragment.app.Fragment;

/**
 * @author Ravjit Uppal
 */
abstract public class StartTabFragment extends Fragment {

    abstract public String getTitle();

    abstract @DrawableRes
    public int getIconId();

    abstract public void updateView();
}
