package com.cliqz.browser.starttab;

import android.content.Context;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;

import com.cliqz.browser.R;

public class Freshtab extends StartTabFragment {

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        final Context context = inflater.getContext();
        final FrameLayout frameLayout = new FrameLayout(context);
        frameLayout.setLayoutParams(new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        frameLayout.setBackground(ContextCompat.getDrawable(context, R.drawable.tab_fragment_background));
        return frameLayout;
    }

    @Override
    String getTitle() {
        return "";
    }

    @Override
    int getIconId() {
        return R.drawable.ic_fresh_tab;
    }
}