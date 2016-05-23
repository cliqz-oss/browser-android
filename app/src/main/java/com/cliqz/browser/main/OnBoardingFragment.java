package com.cliqz.browser.main;

import android.os.Bundle;
import android.support.annotation.LayoutRes;
import android.support.annotation.Nullable;
import android.support.v4.app.Fragment;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

/**
 * @author Stefano Pacifici
 * @date 2016/01/14
 */
public abstract class OnBoardingFragment extends Fragment {

    @Nullable
    @Override
    public final View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        final View view = inflater.inflate(getLayout(), container, false);
        return view;
    }

    @LayoutRes
    protected abstract int getLayout();
}
