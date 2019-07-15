/**
 * Generated source file do not edit
 */
package com.cliqz.widget;

import android.content.Context;
import android.util.AttributeSet;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cliqz.browser.R;

public class CliqzImageButton extends androidx.appcompat.widget.AppCompatImageButton {

    private static final int[] STATE_INCOGNITO = {R.attr.state_incognito};

    private boolean mIsIncognito = false;

    public CliqzImageButton(@NonNull Context context) {
        this(context, null);
    }

    public CliqzImageButton(@NonNull Context context, @Nullable AttributeSet attrs) {
        this(context, attrs, 0);
    }

    public CliqzImageButton(@NonNull Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
    }

    @Override
    public int[] onCreateDrawableState(int extraSpace) {
        if (mIsIncognito) {
            // We are going to add 1 extra state.
            final int[] drawableState = super.onCreateDrawableState(extraSpace + 1);

            mergeDrawableStates(drawableState, STATE_INCOGNITO);
            return drawableState;
        } else {
            return super.onCreateDrawableState(extraSpace);
        }
    }

    public final void setIncognito(boolean value) {
        if (mIsIncognito != value) {
            mIsIncognito = value;
            refreshDrawableState();
        }
    }

    public final boolean isIncognito() {
        return mIsIncognito;
    }
}