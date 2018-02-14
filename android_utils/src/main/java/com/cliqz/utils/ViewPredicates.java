package com.cliqz.utils;

import android.support.annotation.IdRes;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.view.View;

/**
 * @author Stefano Pacifici
 */
class ViewPredicates {

    interface ViewPredicate {
        boolean evaluate(View view);
    }

    @NonNull
    static ViewPredicate sameId(@IdRes int id) {
        return new SameIdPredicate(id);
    }

    @NonNull
    static ViewPredicate sameTag(@IdRes int id) {
        return new SameTagAndValuePredicate(id, null);
    }

    @NonNull
    static ViewPredicate sameTagAndValue(@IdRes int id, @NonNull Object value) {
        return new SameTagAndValuePredicate(id, value);
    }

    private static class SameIdPredicate implements ViewPredicate {

        private final int id;

        SameIdPredicate(@IdRes int id) {
            this.id = id;
        }

        @Override
        public boolean evaluate(@Nullable View view) {
            return view != null && view.getId() == id;
        }
    }

    private static class SameTagAndValuePredicate implements ViewPredicate {
        private final int id;
        private final Object value;

        SameTagAndValuePredicate(@IdRes int id, Object value) {
            this.id = id;
            this.value = value;
        }

        @Override
        public boolean evaluate(View view) {
            return view != null &&
                    (
                            (value == null && view.getTag(id) != null) ||
                            (value != null && value.equals(view.getTag(id)))
                    );
        }
    }
}
