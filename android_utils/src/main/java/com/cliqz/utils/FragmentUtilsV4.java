package com.cliqz.utils;

import android.app.Activity;
import android.content.Context;
import android.support.annotation.NonNull;
import android.support.v4.app.Fragment;

/**
 * @author Stefano Pacifici
 */
public class FragmentUtilsV4 {

    /**
     * Returns a non-null {@link Context} instance or throws
     * @param fragment a non-null {@link Fragment}
     * @return a {@link Context}
     * @throws NoInstanceException if {@link Fragment#getContext()} returns null
     */
    @NonNull
    public static Context getContext(@NonNull Fragment fragment) throws NoInstanceException {
        final Context context = fragment.getContext();
        if (context == null) {
            throw new NoInstanceException();
        }
        return context;
    }

    /**
     * Returns a non-null {@link Activity} instance or throws
     * @param fragment a non-null {@link Fragment}
     * @return an {@link Activity}
     * @throws NoInstanceException if {@link Fragment#getActivity()} returns null
     */
    @NonNull
    public static Activity getActivity(@NonNull Fragment fragment) throws NoInstanceException {
        final Activity activity = fragment.getActivity();
        if (activity == null) {
            throw new NoInstanceException();
        }
        return activity;
    }
}
