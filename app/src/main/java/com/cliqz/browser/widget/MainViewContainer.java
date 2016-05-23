package com.cliqz.browser.widget;

import android.content.Context;
import android.util.AttributeSet;
import android.view.WindowInsets;
import android.widget.FrameLayout;

/**
 * Workaround to solve insect problems and resize of the content when the keyboard appears.
 * Notice that on applyWindowsInsects can be used to detect if keyboard has be opened.
 *
 * @author Stefano Pacifici
 * @date 2015/12/16
 */
public class MainViewContainer extends FrameLayout {

    public MainViewContainer(Context context) {
        this(context, null);
    }

    public MainViewContainer(Context context, AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public MainViewContainer(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    public WindowInsets onApplyWindowInsets(WindowInsets insets) {
        final int left = insets.getSystemWindowInsetLeft();
        final int right = insets.getSystemWindowInsetRight();
        final int bottom = insets.getSystemWindowInsetBottom();

        final WindowInsets consumed = insets.replaceSystemWindowInsets(left, 0, right, bottom);
        return super.onApplyWindowInsets(consumed);
    }
}
