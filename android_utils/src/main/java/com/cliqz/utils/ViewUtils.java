package com.cliqz.utils;

import androidx.annotation.IdRes;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewManager;
import android.view.ViewParent;

import com.cliqz.utils.ViewPredicates.ViewPredicate;

import java.util.Deque;
import java.util.LinkedList;
import java.util.List;

/**
 * @author Stefano Pacifici
 */
@SuppressWarnings("WeakerAccess")
public final class ViewUtils {

    private ViewUtils() {} // No instances

    public static void removeViewFromParent(@NonNull View view) {
        final ViewParent viewParent = view.getParent();
        if (viewParent != null && viewParent instanceof ViewManager) {
            final ViewManager viewManager = ViewManager.class.cast(viewParent);
            viewManager.removeView(view);
        }
    }

    public static void safelyAddView(@NonNull ViewGroup parent, @NonNull View child) {
        final ViewParent currentParent = child.getParent();
        if (currentParent == null) {
            // Simply add to the new parent
            parent.addView(child);
        } else if (currentParent != parent) {
            removeViewFromParent(child);
            parent.addView(child);
        }
    }

    @NonNull
    private static List<View> findAllViewsByPredicate(@NonNull View root,
                                                      @NonNull ViewPredicate predicate) {
        final List<View> result = new LinkedList<>();
        final Deque<View> viewsStack = new LinkedList<>();
        viewsStack.push(root);
        while (!viewsStack.isEmpty()) {
            final View view = viewsStack.pop();
            if (ViewGroup.class.isInstance(view)) {
                final ViewGroup viewGroup = ViewGroup.class.cast(view);
                final int childCount = viewGroup.getChildCount();
                for (int index = 0; index < childCount; index++) {
                    viewsStack.push(viewGroup.getChildAt(index));
                }
            }
            if (predicate.evaluate(view)) {
                result.add(view);
            }
        }
        return result;
    }

    /**
     * Given a generic view, recursively find all the children with the same id
     *
     * @param container a {@link View} to search in
     * @param id the id of the views you want to find
     * @return a list of the found views, possibly empty if nothing matches the id
     */
    @NonNull
    public static List<View> findAllViewsWithId(@NonNull View container, @IdRes int id) {
        return findAllViewsByPredicate(container, ViewPredicates.sameId(id));
    }

    /**
     * Given a generic view, recursively find all the children with the same id
     *
     * @param root a {@link View} to search in
     * @param tag the tag key value
     * @param value the tag value, can be null. In the latter case we look for a non null tag value
     * @return a list of the found views, possibly empty if nothing matches the tag
     */
    @NonNull
    public static List<View> findAllViewByTag(@NonNull View root, int tag, @Nullable Object value) {
        if (value == null) {
            return findAllViewsByPredicate(root, ViewPredicates.sameTag(tag));
        } else {
            return findAllViewsByPredicate(root, ViewPredicates.sameTagAndValue(tag, value));
        }
    }
}
