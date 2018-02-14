package com.cliqz.browser.main.search;

import android.content.res.Resources;
import android.graphics.Rect;
import android.view.View;

import com.cliqz.utils.ContextUtils;

/**
 * Capture the topsite view as a bitmap and contains all the data needed to implement view
 * drag&drop
 *
 * @author Stefano Pacifici
 */
class Utils {

    private static int sStatusBarHeight = -1;

    static Rect calculatePositionFrom(View from) {
        if (sStatusBarHeight < 0) {
            sStatusBarHeight = ContextUtils.getStatusBarHeight(from.getContext());
        }
        final int[] outLocation = new int[2];
        from.getLocationInWindow(outLocation);
        final int left = outLocation[0];
        final int top = outLocation[1] - sStatusBarHeight;
        final int right = left + from.getWidth();
        final int bottom = top + from.getHeight();
        return new Rect(left, top, right, bottom);
    }



}
